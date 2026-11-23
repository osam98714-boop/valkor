import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { admins } from "../../drizzle/schema";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { ALL_PERMISSIONS, bootstrapRootAdmin, clearAdminSession, findLoginAdmin, hashPassword, rolePermissions, setAdminSession, verifyPassword } from "./admin-auth";
import { recordAudit, requireDb } from "./common";

function publicAdmin(admin: NonNullable<Awaited<ReturnType<typeof bootstrapRootAdmin>>>) {
  return { id: admin.id, username: admin.username, displayName: admin.displayName, role: admin.role, permissions: rolePermissions(admin), isRoot: admin.isRoot, enabled: admin.enabled, lastLoginAt: admin.lastLoginAt, createdAt: admin.createdAt };
}

const usernameSchema = z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9_.-]+$/);
const passwordSchema = z.string().min(12).max(200);
const roles = ["super_admin", "product_manager", "order_manager", "content_manager", "custom"] as const;

export const adminAuthRouter = router({
  status: publicProcedure.query(() => ({ configured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET && Buffer.byteLength(process.env.SESSION_SECRET) >= 32) })),
  me: publicProcedure.query(({ ctx }) => ctx.admin ? publicAdmin(ctx.admin) : null),
  login: publicProcedure.input(z.object({ username: usernameSchema, password: z.string().min(1).max(200) })).mutation(async ({ input, ctx }) => {
    if (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET) < 32) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "إعداد جلسة الإدارة غير مكتمل؛ أضف SESSION_SECRET من إعدادات البيئة" });
    const result = await findLoginAdmin(input.username);
    if (!result || !verifyPassword(input.password, result.hash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    const db = await requireDb();
    await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, result.admin.id));
    const [fresh] = await db.select().from(admins).where(eq(admins.id, result.admin.id)).limit(1);
    if (!fresh?.enabled) throw new TRPCError({ code: "UNAUTHORIZED", message: "الحساب الإداري معطل" });
    await setAdminSession(ctx.res, fresh);
    return { success: true, admin: publicAdmin(fresh) };
  }),
  logout: publicProcedure.mutation(({ ctx }) => { clearAdminSession(ctx.res); return { success: true }; }),
  list: adminProcedure("admins.write").query(async () => {
    const db = await requireDb();
    const rows = await db.select().from(admins).orderBy(admins.createdAt);
    return rows.map(publicAdmin);
  }),
  create: adminProcedure("admins.write").input(z.object({ username: usernameSchema, displayName: z.string().trim().min(2).max(120), password: passwordSchema, role: z.enum(roles), permissions: z.array(z.enum(ALL_PERMISSIONS)).max(ALL_PERMISSIONS.length).optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [exists] = await db.select({ id: admins.id }).from(admins).where(eq(admins.username, input.username)).limit(1);
    if (exists) throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل" });
    await db.insert(admins).values({ username: input.username, displayName: input.displayName, passwordHash: hashPassword(input.password), role: input.role, permissions: input.permissions ?? null, isRoot: false, enabled: true });
    const [created] = await db.select().from(admins).where(eq(admins.username, input.username)).limit(1);
    if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب" });
    await recordAudit(ctx.admin, "create", "admin", created.id, `role=${created.role}`);
    return publicAdmin(created);
  }),
  update: adminProcedure("admins.write").input(z.object({ id: z.number().int().positive(), displayName: z.string().trim().min(2).max(120).optional(), role: z.enum(roles).optional(), enabled: z.boolean().optional(), permissions: z.array(z.enum(ALL_PERMISSIONS)).max(ALL_PERMISSIONS.length).nullable().optional(), newPassword: passwordSchema.optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [target] = await db.select().from(admins).where(eq(admins.id, input.id)).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود" });
    if (target.isRoot && (input.enabled === false || (input.role && input.role !== "super_admin") || input.newPassword)) throw new TRPCError({ code: "FORBIDDEN", message: "بيانات المدير الرئيسي تُدار من متغيرات البيئة" });
    if (target.id === ctx.admin.id && input.enabled === false) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تعطيل جلستك الحالية" });
    const patch: Record<string, unknown> = {};
    if (input.displayName !== undefined) patch.displayName = input.displayName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    if (input.permissions !== undefined) patch.permissions = input.permissions;
    if (input.newPassword) patch.passwordHash = hashPassword(input.newPassword);
    if (Object.keys(patch).length === 0) return publicAdmin(target);
    await db.update(admins).set(patch).where(eq(admins.id, target.id));
    const [updated] = await db.select().from(admins).where(eq(admins.id, target.id)).limit(1);
    await recordAudit(ctx.admin, "update", "admin", target.id, `fields=${Object.keys(patch).join(",")}`);
    return publicAdmin(updated!);
  }),
  remove: adminProcedure("admins.write").input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    if (input.id === ctx.admin.id) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حذف الحساب المستخدم حاليًا" });
    const [target] = await db.select().from(admins).where(eq(admins.id, input.id)).limit(1);
    if (!target) return { success: true };
    if (target.isRoot) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن حذف المدير الرئيسي" });
    await db.delete(admins).where(and(eq(admins.id, target.id), ne(admins.isRoot, true)));
    await recordAudit(ctx.admin, "delete", "admin", target.id, `username=${target.username}`);
    return { success: true };
  }),
  permissions: adminProcedure("admins.write").query(() => ALL_PERMISSIONS),
});

import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import { requireCsrf, rolePermissions, type Permission } from "./admin-auth";

export function adminProcedure(permission?: Permission) {
  return publicProcedure.use(({ ctx, next }) => {
    if (!ctx.admin?.enabled) throw new TRPCError({ code: "UNAUTHORIZED", message: "يلزم تسجيل دخول مدير" });
    if (ctx.req.method === "POST" && !requireCsrf(ctx.req)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "تعذر التحقق من طلب الإدارة؛ حدّث الصفحة وحاول مجددًا" });
    }
    if (permission && !rolePermissions(ctx.admin).includes(permission)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تنفيذ هذا الإجراء" });
    }
    return next({ ctx: { ...ctx, admin: ctx.admin } });
  });
}

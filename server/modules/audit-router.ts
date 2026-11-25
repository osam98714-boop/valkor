import { desc, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { auditLogs } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { requireDb } from "./common";

export const deleteAuditLogsInputSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  confirmed: z.literal(true),
});

export const auditAdminRouter = router({
  list: adminProcedure("audit.read").input(z.object({ q: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(300).default(100) }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const limit = input?.limit ?? 100;
    if (!input?.q) return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    const pattern = `%${input.q}%`;
    return db.select().from(auditLogs).where(or(like(auditLogs.adminUsername, pattern), like(auditLogs.action, pattern), like(auditLogs.entity, pattern), like(auditLogs.entityId, pattern))!).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }),
  deleteSelected: adminProcedure("audit.delete").input(deleteAuditLogsInputSchema).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const requestedIds = [...new Set(input.ids)];
    return db.transaction(async tx => {
      const matched = await tx.select({ id: auditLogs.id }).from(auditLogs).where(inArray(auditLogs.id, requestedIds)).for("update");
      const deletedIds = matched.map(row => row.id);
      if (!deletedIds.length) return { success: true, deletedCount: 0 };
      await tx.delete(auditLogs).where(inArray(auditLogs.id, deletedIds));
      await tx.insert(auditLogs).values({
        adminId: ctx.admin.id,
        adminUsername: ctx.admin.username,
        action: "delete",
        entity: "audit_logs",
        details: `deletedCount=${deletedIds.length};ids=${deletedIds.join(",")}`,
      });
      return { success: true, deletedCount: deletedIds.length };
    });
  }),
});

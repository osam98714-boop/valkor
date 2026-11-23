import { desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { auditLogs } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { requireDb } from "./common";

export const auditAdminRouter = router({
  list: adminProcedure("audit.read").input(z.object({ q: z.string().trim().max(100).optional(), limit: z.number().int().min(1).max(300).default(100) }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const limit = input?.limit ?? 100;
    if (!input?.q) return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
    const pattern = `%${input.q}%`;
    return db.select().from(auditLogs).where(or(like(auditLogs.adminUsername, pattern), like(auditLogs.action, pattern), like(auditLogs.entity, pattern), like(auditLogs.entityId, pattern))!).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }),
});

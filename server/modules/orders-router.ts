import { and, desc, eq, like, lte, gte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { customers, orderItems, orders, products, auditLogs } from "../../drizzle/schema";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { requireDb } from "./common";
import { quantityAfterRestock, shouldRestockWhenDeletingOrder } from "./order-inventory";

const orderStatus = z.enum(["new", "pending_payment", "paid", "in_progress", "delivered", "cancelled"]);
export const ordersAdminRouter = router({
  list: adminProcedure("orders.read").input(z.object({ q: z.string().trim().max(100).optional(), status: orderStatus.optional(), from: z.string().optional(), to: z.string().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const filters = [];
    if (input?.status) filters.push(eq(orders.status, input.status));
    if (input?.from) filters.push(gte(orders.createdAt, new Date(input.from)));
    if (input?.to) filters.push(lte(orders.createdAt, new Date(`${input.to}T23:59:59.999Z`)));
    if (input?.q) {
      const p = `%${input.q}%`;
      const matches = await db.select({ id: customers.id }).from(customers).where(or(like(customers.name, p), like(customers.phone, p)));
      const customerIds = matches.map(row => row.id);
      filters.push(or(like(orders.orderNo, p), customerIds.length ? (await import("drizzle-orm")).inArray(orders.customerId, customerIds) : undefined)!);
    }
    const rows = filters.length
      ? await db.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(...filters)).orderBy(desc(orders.createdAt)).limit(300)
      : await db.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).orderBy(desc(orders.createdAt)).limit(300);
    const ids = rows.map(row => row.order.id);
    const lines = ids.length ? await db.select().from(orderItems).where((await import("drizzle-orm")).inArray(orderItems.orderId, ids)) : [];
    const linesByOrder = new Map<number, typeof lines>();
    for (const line of lines) linesByOrder.set(line.orderId, [...(linesByOrder.get(line.orderId) ?? []), line]);
    return rows.map(row => ({ ...row.order, customer: row.customer, items: linesByOrder.get(row.order.id) ?? [] }));
  }),
  detail: adminProcedure("orders.read").input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(eq(orders.id, input.id)).limit(1);
    if (!row) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
    return { ...row.order, customer: row.customer, items };
  }),
  updateStatus: adminProcedure("orders.write").input(z.object({ id: z.number().int().positive(), status: orderStatus, paymentNote: z.string().max(1000).optional() })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    return db.transaction(async tx => {
      const [old] = await tx.select().from(orders).where(eq(orders.id, input.id)).for("update").limit(1);
      if (!old) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (old.status === "cancelled" && input.status !== "cancelled") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يمكن إعادة فتح طلب ملغى؛ أنشئ طلبًا جديدًا لتفادي خطأ المخزون" });
      await tx.update(orders).set({ status: input.status, paymentNote: input.paymentNote ?? old.paymentNote }).where(eq(orders.id, input.id));
      if (input.status === "cancelled" && old.status !== "cancelled") {
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, old.id));
        for (const line of lines) if (line.productId) {
          const [product] = await tx.select().from(products).where(eq(products.id, line.productId)).for("update").limit(1);
          if (product?.trackInventory) await tx.update(products).set({ quantity: quantityAfterRestock(product.quantity, line.quantity) }).where(eq(products.id, product.id));
        }
      }
      await tx.insert(auditLogs).values({ adminId: ctx.admin.id, adminUsername: ctx.admin.username, action: "status_change", entity: "order", entityId: String(old.id), details: `${old.status} -> ${input.status}` });
      return { success: true };
    });
  }),
  remove: adminProcedure("orders.delete").input(z.object({ id: z.number().int().positive(), confirmed: z.literal(true) })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    return db.transaction(async tx => {
      const [old] = await tx.select().from(orders).where(eq(orders.id, input.id)).for("update").limit(1);
      if (!old) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (shouldRestockWhenDeletingOrder(old.status)) {
        const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, old.id));
        for (const line of lines) if (line.productId) {
          const [product] = await tx.select().from(products).where(eq(products.id, line.productId)).for("update").limit(1);
          if (product?.trackInventory) await tx.update(products).set({ quantity: quantityAfterRestock(product.quantity, line.quantity) }).where(eq(products.id, product.id));
        }
      }
      await tx.delete(orders).where(eq(orders.id, input.id));
      await tx.insert(auditLogs).values({ adminId: ctx.admin.id, adminUsername: ctx.admin.username, action: "delete", entity: "order", entityId: String(old.id), details: `orderNo=${old.orderNo};status=${old.status}` });
      return { success: true, orderNo: old.orderNo };
    });
  }),
  stats: adminProcedure("dashboard.read").query(async () => {
    const db = await requireDb();
    const allOrders = await db.select({ status: orders.status, total: orders.total, currencyCode: orders.currencyCode }).from(orders);
    const allProducts = await db.select({ status: products.status, published: products.published, orderCount: products.orderCount, nameAr: products.nameAr }).from(products);
    const customerRows = await db.select({ id: customers.id }).from(customers);
    const paidStatuses = new Set(["paid", "in_progress", "delivered"]);
    const totalsByCurrency: Record<string, number> = {};
    const paidByCurrency: Record<string, number> = {};
    const pendingByCurrency: Record<string, number> = {};
    for (const order of allOrders) {
      const total = Number(order.total || 0);
      totalsByCurrency[order.currencyCode] = (totalsByCurrency[order.currencyCode] ?? 0) + total;
      if (paidStatuses.has(order.status)) paidByCurrency[order.currencyCode] = (paidByCurrency[order.currencyCode] ?? 0) + total;
      else if (order.status !== "cancelled") pendingByCurrency[order.currencyCode] = (pendingByCurrency[order.currencyCode] ?? 0) + total;
    }
    return {
      totalOrders: allOrders.length,
      newOrders: allOrders.filter(o => o.status === "new").length,
      completedOrders: allOrders.filter(o => o.status === "delivered").length,
      cancelledOrders: allOrders.filter(o => o.status === "cancelled").length,
      availableProducts: allProducts.filter(p => p.published && p.status === "available").length,
      unavailableProducts: allProducts.filter(p => !p.published || p.status !== "available").length,
      customers: customerRows.length,
      totalsByCurrency,
      paidByCurrency,
      pendingByCurrency,
      popularProducts: allProducts.filter(p => p.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount).slice(0, 5),
    };
  }),
});

export const customerAdminRouter = router({
  list: adminProcedure("customers.read").input(z.object({ q: z.string().trim().max(100).optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const query = input?.q ? db.select().from(customers).where(or(like(customers.name, `%${input.q}%`), like(customers.phone, `%${input.q}%`))).orderBy(desc(customers.createdAt)) : db.select().from(customers).orderBy(desc(customers.createdAt));
    const rows = await query.limit(300);
    const ids = rows.map(c => c.id);
    const linkedOrders = ids.length ? await db.select({ order: orders, customerId: orders.customerId }).from(orders).where((await import("drizzle-orm")).inArray(orders.customerId, ids)).orderBy(desc(orders.createdAt)) : [];
    const ordersByCustomer = new Map<number, typeof linkedOrders>();
    linkedOrders.forEach(row => ordersByCustomer.set(row.customerId, [...(ordersByCustomer.get(row.customerId) ?? []), row]));
    return rows.map(customer => ({ ...customer, orders: (ordersByCustomer.get(customer.id) ?? []).map(row => row.order) }));
  }),
});

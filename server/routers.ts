import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storefrontRouter } from "./modules/storefront-router";
import { adminAuthRouter } from "./modules/admin-auth-router";
import { catalogAdminRouter } from "./modules/catalog-router";
import { ordersAdminRouter, customerAdminRouter } from "./modules/orders-router";
import { settingsAdminRouter } from "./modules/settings-router";
import { auditAdminRouter } from "./modules/audit-router";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  storefront: storefrontRouter,
  adminAuth: adminAuthRouter,
  adminCatalog: catalogAdminRouter,
  adminOrders: ordersAdminRouter,
  adminCustomers: customerAdminRouter,
  adminSettings: settingsAdminRouter,
  adminAudit: auditAdminRouter,
});

export type AppRouter = typeof appRouter;

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User, AdminAccount } from "../../drizzle/schema";
import { getAdminForRequest } from "../modules/admin-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  admin: AdminAccount | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const admin = await getAdminForRequest(opts.req);
  return { req: opts.req, res: opts.res, user: null, admin };
}

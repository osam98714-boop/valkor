import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import { and, eq } from "drizzle-orm";
import { admins, type AdminAccount } from "../../drizzle/schema";
import { getDb } from "../db";

export const ADMIN_COOKIE = "valkor_admin_session";
export const CSRF_COOKIE = "vlkr_csrf";
export const SESSION_SECONDS = 60 * 60 * 12;
export const ALL_PERMISSIONS = [
  "dashboard.read", "products.read", "products.write", "products.delete",
  "categories.read", "categories.write", "orders.read", "orders.write", "orders.delete",
  "customers.read", "communities.write", "currencies.write", "content.write",
  "settings.write", "homepage.write", "admins.write", "audit.read", "audit.delete", "maintenance.write",
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

export function isPasswordHash(stored: string): boolean {
  const [kind, saltHex, hashHex, ...rest] = stored.split("$");
  return kind === "scrypt" && rest.length === 0 && /^[a-f0-9]{32}$/i.test(saltHex ?? "") && /^[a-f0-9]{128}$/i.test(hashHex ?? "");
}

export function hashPassword(password: string): string {
  if (password.length < 12) throw new Error("كلمة المرور يجب أن تتكون من 12 حرفًا على الأقل");
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (!isPasswordHash(stored)) return false;
    const [, saltHex, hashHex] = stored.split("$");
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function rolePermissions(admin: Pick<AdminAccount, "role" | "permissions">): string[] {
  if (admin.role === "super_admin") return [...ALL_PERMISSIONS];
  if (admin.permissions !== null) return admin.permissions ?? [];
  const roles: Record<string, string[]> = {
    product_manager: ["dashboard.read", "products.read", "products.write", "products.delete", "categories.read", "categories.write"],
    order_manager: ["dashboard.read", "orders.read", "orders.write", "orders.delete", "customers.read"],
    content_manager: ["dashboard.read", "products.read", "categories.read", "categories.write", "homepage.write", "content.write", "communities.write"],
    custom: [],
  };
  return roles[admin.role] ?? [];
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw new Error("SESSION_SECRET غير مهيأ أو أقصر من 32 بايت");
  return new TextEncoder().encode(value);
}

function setCookie(res: Response, name: string, value: string, maxAge: number, httpOnly: boolean) {
  res.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=None; Secure${httpOnly ? "; HttpOnly" : ""}`);
}

export async function setAdminSession(res: Response, admin: AdminAccount) {
  const token = await new SignJWT({ username: admin.username, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(sessionSecret());
  setCookie(res, ADMIN_COOKIE, token, SESSION_SECONDS, true);
  setCookie(res, CSRF_COOKIE, randomBytes(24).toString("base64url"), SESSION_SECONDS, false);
}

export function clearAdminSession(res: Response) {
  setCookie(res, ADMIN_COOKIE, "", 0, true);
  setCookie(res, CSRF_COOKIE, "", 0, false);
}

export async function getAdminForRequest(req: Request): Promise<AdminAccount | null> {
  try {
    const token = parse(req.headers.cookie ?? "")[ADMIN_COOKIE];
    if (!token) return null;
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id < 1) return null;
    const db = await getDb();
    if (!db) return null;
    const [admin] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    return admin?.enabled ? admin : null;
  } catch {
    return null;
  }
}

export function requireCsrf(req: Request) {
  const cookies = parse(req.headers.cookie ?? "");
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.header("x-vlkr-csrf");
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) return false;
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

export async function bootstrapRootAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!username || !passwordHash || !isPasswordHash(passwordHash)) return null;
  const db = await getDb();
  if (!db) return null;
  const [existing] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  if (existing) {
    if (!existing.isRoot || existing.passwordHash !== passwordHash || !existing.enabled || existing.role !== "super_admin") {
      await db.update(admins).set({ enabled: true, isRoot: true, role: "super_admin", passwordHash, permissions: [...ALL_PERMISSIONS], displayName: "المدير الرئيسي" }).where(eq(admins.id, existing.id));
      const [updated] = await db.select().from(admins).where(eq(admins.id, existing.id)).limit(1);
      return updated ?? null;
    }
    return existing;
  }
  await db.insert(admins).values({ username, displayName: "المدير الرئيسي", passwordHash, role: "super_admin", permissions: [...ALL_PERMISSIONS], isRoot: true, enabled: true });
  const [created] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  return created ?? null;
}

export async function findLoginAdmin(username: string) {
  const db = await getDb();
  if (!db) return null;
  const envUsername = process.env.ADMIN_USERNAME?.trim();
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (envUsername && username === envUsername && envHash && isPasswordHash(envHash)) {
    const root = await bootstrapRootAdmin();
    return root ? { admin: root, hash: envHash } : null;
  }
  const [admin] = await db.select().from(admins).where(and(eq(admins.username, username), eq(admins.enabled, true))).limit(1);
  return admin ? { admin, hash: admin.passwordHash } : null;
}

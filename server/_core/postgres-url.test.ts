import { describe, expect, it } from "vitest";
import { resolvePostgresDatabaseUrl } from "./env";

describe("resolvePostgresDatabaseUrl", () => {
  it("prefers a valid NEON_DATABASE_URL", () => {
    const neonUrl = "postgresql://neon-user:fake-password@ep-example.neon.tech/store?sslmode=require";
    const fallbackUrl = "postgres://fallback-user:fake-password@db.example.test/store";

    expect(resolvePostgresDatabaseUrl({ NEON_DATABASE_URL: neonUrl, DATABASE_URL: fallbackUrl })).toBe(neonUrl);
  });

  it("falls back to DATABASE_URL only when it is PostgreSQL", () => {
    const databaseUrl = "postgres://user:fake-password@db.example.test/store";

    expect(resolvePostgresDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(databaseUrl);
    expect(resolvePostgresDatabaseUrl({ DATABASE_URL: "mysql://user:fake-password@db.example.test/store" })).toBeUndefined();
  });

  it("does not silently fall back when the preferred Neon URL is invalid", () => {
    expect(resolvePostgresDatabaseUrl({
      NEON_DATABASE_URL: "mysql://user:fake-password@db.example.test/store",
      DATABASE_URL: "postgresql://fallback-user:fake-password@db.example.test/store",
    })).toBeUndefined();
  });

  it("rejects malformed or hostless PostgreSQL URLs", () => {
    expect(resolvePostgresDatabaseUrl({ DATABASE_URL: "not-a-url" })).toBeUndefined();
    expect(resolvePostgresDatabaseUrl({ DATABASE_URL: "postgresql:///store" })).toBeUndefined();
  });
});

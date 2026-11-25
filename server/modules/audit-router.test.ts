import { describe, expect, it } from "vitest";
import { deleteAuditLogsInputSchema } from "./audit-router";

describe("deleteAuditLogsInputSchema", () => {
  it("accepts a confirmed selection of up to 100 positive IDs", () => {
    const input = { ids: Array.from({ length: 100 }, (_, index) => index + 1), confirmed: true };
    expect(deleteAuditLogsInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects empty, oversized, non-positive, and unconfirmed selections", () => {
    expect(deleteAuditLogsInputSchema.safeParse({ ids: [], confirmed: true }).success).toBe(false);
    expect(deleteAuditLogsInputSchema.safeParse({ ids: Array.from({ length: 101 }, (_, index) => index + 1), confirmed: true }).success).toBe(false);
    expect(deleteAuditLogsInputSchema.safeParse({ ids: [0], confirmed: true }).success).toBe(false);
    expect(deleteAuditLogsInputSchema.safeParse({ ids: [1], confirmed: false }).success).toBe(false);
  });
});

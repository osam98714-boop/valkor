import { describe, expect, it } from "vitest";
import { quantityAfterRestock, shouldRestockWhenDeletingOrder } from "./order-inventory";

describe("order deletion inventory policy", () => {
  it("restores inventory only when deleting an unprocessed order", () => {
    expect(shouldRestockWhenDeletingOrder("new")).toBe(true);
    expect(shouldRestockWhenDeletingOrder("pending_payment")).toBe(true);
    for (const status of ["paid", "in_progress", "delivered", "cancelled"]) {
      expect(shouldRestockWhenDeletingOrder(status)).toBe(false);
    }
  });

  it("adds back the ordered units and rejects invalid quantities", () => {
    expect(quantityAfterRestock(0, 1)).toBe(1);
    expect(quantityAfterRestock(2, 3)).toBe(5);
    expect(() => quantityAfterRestock(-1, 1)).toThrow(RangeError);
    expect(() => quantityAfterRestock(1, 0)).toThrow(RangeError);
  });
});

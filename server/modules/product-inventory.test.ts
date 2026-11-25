import { describe, expect, it } from "vitest";
import { calculateProductSaleUpdate } from "./product-inventory";

describe("calculateProductSaleUpdate", () => {
  it("marks a one-unit tracked product sold out after the successful sale", () => {
    expect(calculateProductSaleUpdate({ trackInventory: true, quantity: 1, orderCount: 0 }, 1)).toEqual({
      orderCount: 1,
      quantity: 0,
      status: "sold_out",
    });
  });

  it("decrements tracked stock but keeps the product available while units remain", () => {
    expect(calculateProductSaleUpdate({ trackInventory: true, quantity: 4, orderCount: 2 }, 1)).toEqual({
      orderCount: 3,
      quantity: 3,
    });
  });

  it("increments order count without changing inventory when tracking is disabled", () => {
    expect(calculateProductSaleUpdate({ trackInventory: false, quantity: 0, orderCount: 5 }, 2)).toEqual({
      orderCount: 7,
    });
  });

  it("rejects a sale that exceeds tracked inventory", () => {
    expect(() => calculateProductSaleUpdate({ trackInventory: true, quantity: 0, orderCount: 0 }, 1)).toThrow(
      "كمية البيع تتجاوز المخزون المتاح",
    );
  });
});

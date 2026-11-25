import type { Product } from "../../drizzle/schema";

export type ProductSaleUpdate = {
  orderCount: number;
  quantity?: number;
  status?: Product["status"];
};

export function calculateProductSaleUpdate(
  product: Pick<Product, "trackInventory" | "quantity" | "orderCount">,
  soldQuantity: number,
): ProductSaleUpdate {
  if (!Number.isInteger(soldQuantity) || soldQuantity < 1) {
    throw new Error("كمية البيع يجب أن تكون عددًا صحيحًا موجبًا");
  }
  if (!product.trackInventory) {
    return { orderCount: product.orderCount + soldQuantity };
  }
  if (product.quantity < soldQuantity) {
    throw new Error("كمية البيع تتجاوز المخزون المتاح");
  }

  const quantity = product.quantity - soldQuantity;
  return {
    orderCount: product.orderCount + soldQuantity,
    quantity,
    ...(quantity === 0 ? { status: "sold_out" } : {}),
  };
}

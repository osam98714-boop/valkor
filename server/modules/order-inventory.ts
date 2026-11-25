export function shouldRestockWhenDeletingOrder(status: string): boolean {
  return status === "new" || status === "pending_payment";
}

export function quantityAfterRestock(currentQuantity: number, orderedQuantity: number): number {
  if (!Number.isInteger(currentQuantity) || currentQuantity < 0) {
    throw new RangeError("Current inventory must be a non-negative integer");
  }
  if (!Number.isInteger(orderedQuantity) || orderedQuantity < 1) {
    throw new RangeError("Ordered quantity must be a positive integer");
  }
  return currentQuantity + orderedQuantity;
}

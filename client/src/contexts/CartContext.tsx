import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
export type CartItem = { productId: number; itemKind?: "product" | "community"; slug: string; sku: string; nameAr: string; nameEn: string; price: string; currencyCode: string | null; imageUrl: string | null; quantity: number; trackInventory: boolean; availableQuantity: number };
type CartContextType = { items: CartItem[]; directItems: CartItem[]; add: (item: CartItem) => void; setQuantity: (id: number, quantity: number) => void; remove: (id: number) => void; clear: () => void; startDirect: (item: CartItem) => void; clearDirect: () => void; totalItems: number };
const CartContext = createContext<CartContextType | undefined>(undefined);
function readStored(): CartItem[] { try { const raw = localStorage.getItem("valkor-cart"); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStored);
  const [directItems, setDirectItems] = useState<CartItem[]>([]);
  useEffect(() => { try { localStorage.setItem("valkor-cart", JSON.stringify(items)); } catch { /* storage may be unavailable */ } }, [items]);
  const add = (item: CartItem) => setItems(previous => {
    const existing = previous.find(row => row.productId === item.productId);
    if (!existing) return [...previous, item];
    return previous.map(row => row.productId === item.productId ? { ...row, quantity: Math.min(row.quantity + item.quantity, row.trackInventory ? row.availableQuantity : 99) } : row);
  });
  const setQuantity = (id: number, quantity: number) => setItems(previous => previous.map(row => row.productId !== id ? row : { ...row, quantity: Math.max(1, Math.min(quantity, row.trackInventory ? Math.max(1, row.availableQuantity) : 99)) }));
  const remove = (id: number) => setItems(previous => previous.filter(row => row.productId !== id));
  const clear = () => setItems([]);
  const startDirect = (item: CartItem) => setDirectItems([{ ...item, quantity: 1 }]);
  const clearDirect = () => setDirectItems([]);
  const totalItems = useMemo(() => items.reduce((sum, row) => sum + row.quantity, 0), [items]);
  return <CartContext.Provider value={{ items, directItems, add, setQuantity, remove, clear, startDirect, clearDirect, totalItems }}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used within CartProvider"); return value; }

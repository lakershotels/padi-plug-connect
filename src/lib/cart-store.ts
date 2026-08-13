import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  title: string;
  image: string | null;
  priceKobo: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  stock: number;
};

const KEY = "padiplug.cart.v1";
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (loaded || typeof window === "undefined") return items;
  try {
    const raw = window.localStorage.getItem(KEY);
    items = raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    items = [];
  }
  loaded = true;
  return items;
}

function commit(next: CartItem[]) {
  items = next;
  loaded = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function addToCart(item: CartItem) {
  const cur = load();
  const existing = cur.find((i) => i.productId === item.productId);
  const next = existing
    ? cur.map((i) =>
        i.productId === item.productId ? { ...i, quantity: Math.min(i.stock || 99, i.quantity + item.quantity) } : i,
      )
    : [...cur, item];
  commit(next);
}

export function setQuantity(productId: string, quantity: number) {
  commit(load().map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(i.stock || 99, quantity)) } : i)));
}

export function removeFromCart(productId: string) {
  commit(load().filter((i) => i.productId !== productId));
}

export function clearCart() {
  commit([]);
}

export function useCart() {
  const list = useSyncExternalStore(subscribe, load, () => [] as CartItem[]);
  const subtotalKobo = list.reduce((s, i) => s + i.priceKobo * i.quantity, 0);
  const count = list.reduce((s, i) => s + i.quantity, 0);
  return { items: list, subtotalKobo, count };
}

export const SHIPPING_METHODS = [
  { id: "pickup", label: "Pickup at seller", note: "Arrange collection with the seller", feeKobo: 0 },
  { id: "standard", label: "Standard delivery", note: "3–5 working days", feeKobo: 150000 },
  { id: "express", label: "Express delivery", note: "24–48 hours", feeKobo: 350000 },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

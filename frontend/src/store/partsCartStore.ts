import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, PartProduct } from "@/features/parts/types";

const MAX_QTY = 500;

interface PartsCartState {
  lines: CartLine[];
  addProduct: (part: PartProduct, qty: number, unitPrice?: number) => void;
  removeLine: (partId: string) => void;
  setQty: (partId: string, qty: number) => void;
  clear: () => void;
  itemCount: () => number;
}

export const usePartsCartStore = create<PartsCartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addProduct: (part, qty) => {
        const cap = Math.max(1, Math.min(part.stock, MAX_QTY));
        set((s) => {
          const existing = s.lines.find((l) => l.partId === part.id);
          const image = part.images[0] ?? "";
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.partId === part.id
                  ? {
                      ...l,
                      qty: Math.min(l.qty + qty, cap),
                      price: part.price,
                      wholesalePrice: part.wholesalePrice,
                      bulkMinQty: part.bulkMinQty,
                      stock: part.stock,
                    }
                  : l
              ),
            };
          }
          return {
            lines: [
              ...s.lines,
              {
                partId: part.id,
                slug: part.slug,
                name: part.name,
                categorySlug: part.categorySlug,
                image,
                price: part.price,
                wholesalePrice: part.wholesalePrice,
                gstRate: part.gstRate,
                bulkMinQty: part.bulkMinQty,
                sellerId: part.sellerId,
                stock: part.stock,
                qty: Math.min(Math.max(1, qty), cap),
              },
            ],
          };
        });
      },
      removeLine: (partId) => set((s) => ({ lines: s.lines.filter((l) => l.partId !== partId) })),
      setQty: (partId, qty) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.partId === partId ? { ...l, qty: Math.min(Math.max(1, qty), Math.max(1, Math.min(l.stock ?? MAX_QTY, MAX_QTY))) } : l
          ),
        })),
      clear: () => set({ lines: [] }),
      itemCount: () => get().lines.reduce((n, l) => n + l.qty, 0),
    }),
    { name: "motorcart-parts-cart" }
  )
);

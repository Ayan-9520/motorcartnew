import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchSellerPartOrders, fetchSellerParts } from "@/features/parts/services/parts.service";
import type { PartOrder, PartOrderItem } from "@/features/parts/types";

const PARTS_DESK_SELLER_ID = "motorcart-parts-desk";
export const LOW_STOCK_AT = 5;

export const sellerPartsKey = ["parts-seller", "listings"] as const;
export const sellerOrdersKey = ["parts-seller", "orders"] as const;

export function useSellerParts() {
  return useQuery({ queryKey: sellerPartsKey, queryFn: () => fetchSellerParts(), staleTime: 30_000 });
}

export function useSellerOrders() {
  return useQuery({ queryKey: sellerOrdersKey, queryFn: () => fetchSellerPartOrders(), staleTime: 30_000 });
}

export function useRefreshSellerData() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["parts-seller"] });
  }, [qc]);
}

/** Seller ids whose order lines count as "mine" (admins also fulfil the platform parts desk). */
export function useMySellerIds(): Set<string> {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  return useMemo(() => {
    const ids = new Set<string>();
    if (user?.id) ids.add(user.id);
    if (isAdmin) ids.add(PARTS_DESK_SELLER_ID);
    return ids;
  }, [user?.id, isAdmin]);
}

export function myLines(order: PartOrder, mine: Set<string>): PartOrderItem[] {
  return order.items.filter((i) => !i.sellerId || mine.has(i.sellerId));
}

export type OrderMoney = { taxable: number; gst: number; total: number; units: number };

export function myOrderMoney(order: PartOrder, mine: Set<string>): OrderMoney {
  return myLines(order, mine).reduce<OrderMoney>(
    (t, l) => ({
      taxable: t.taxable + l.lineSubtotal,
      gst: t.gst + l.lineGst,
      total: t.total + l.lineTotal,
      units: t.units + l.qty,
    }),
    { taxable: 0, gst: 0, total: 0, units: 0 }
  );
}

export function orderBuyer(order: PartOrder) {
  const a = order.shippingAddress as Record<string, string | undefined>;
  return { name: a.name ?? "Customer", phone: a.phone ?? "", city: a.city ?? "", state: a.state ?? "", pin: a.pin ?? "" };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

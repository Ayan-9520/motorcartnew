import { api } from "@/lib/api/axios";
import type { StockByPinResponse } from "../types";

export async function fetchStockByPincode(pincode: string): Promise<StockByPinResponse> {
  const { data } = await api.get<StockByPinResponse>("/api/inventory/by-pincode", {
    params: { pincode },
  });
  if (data && Array.isArray(data.items)) {
    return { pincode: data.pincode, count: data.count, items: data.items };
  }
  return { pincode, count: 0, items: [] };
}

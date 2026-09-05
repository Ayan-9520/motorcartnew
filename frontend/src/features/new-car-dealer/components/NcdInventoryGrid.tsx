import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { removeNewCarInventory } from "../services/new-car-dealer.service";
import { NewCarEditInventoryDialog } from "./NewCarEditInventoryDialog";
import type { NcdInventoryItem } from "../types";

const STATUS_LABELS = {
  available: "Available",
  booked: "Booked",
  transit: "In transit",
  upcoming: "Upcoming",
  delivered: "Delivered",
};

const HEALTH_VARIANT = {
  fast_moving: "success",
  slow_moving: "secondary",
  dead_stock: "destructive",
} as const;

type Props = {
  items: NcdInventoryItem[];
  onChanged?: () => void;
};

export function NcdInventoryGrid({ items, onChanged }: Props) {
  const [editItem, setEditItem] = useState<NcdInventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (item: NcdInventoryItem) => {
    if (!window.confirm(`Remove ${item.brand} ${item.model} from stock and public listing?`)) return;
    setDeletingId(item.id);
    try {
      const { error } = await removeNewCarInventory(item);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Removed from stock");
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((v) => (
          <article key={v.id} className="ncd-inventory-card">
            <div className="ncd-inventory-card__media">
              <img src={v.imageUrl} alt={`${v.brand} ${v.model}`} className="h-full w-full object-cover" loading="lazy" />
              <Badge className="absolute left-2 top-2 text-[10px]" variant={HEALTH_VARIANT[v.stockHealth]}>
                {v.stockHealth.replace("_", " ")}
              </Badge>
            </div>
            <div className="p-4">
              <h3 className="font-semibold">
                {v.brand} {v.model}
              </h3>
              <p className="text-xs text-muted-foreground">{v.variant}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABELS[v.stockStatus]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {v.fuelType}
                </Badge>
                {v.vehicleId ? (
                  <Badge variant="outline" className="text-[10px]">
                    On website
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-lg font-bold text-primary">
                {v.exShowroomPrice > 0 || v.onRoadPrice > 0
                  ? formatCurrency(v.onRoadPrice > 0 ? v.onRoadPrice : v.exShowroomPrice)
                  : "Price on request"}
              </p>
              {v.exShowroomPrice > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Ex-showroom {formatCurrency(v.exShowroomPrice)}
                  {v.discountAmount > 0 ? ` · Save ${formatCurrency(v.discountAmount)}` : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No numeric price on file</p>
              )}
              {v.expectedDeliveryDays != null ? (
                <p className="mt-1 text-[10px] text-muted-foreground">Delivery ~{v.expectedDeliveryDays} days</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-lg h-8" onClick={() => setEditItem(v)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8 text-destructive hover:text-destructive"
                  disabled={deletingId === v.id}
                  onClick={() => void onDelete(v)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
                {v.vehicleId ? (
                  <Button size="sm" variant="ghost" className="rounded-lg h-8" asChild>
                    <Link to="/buy/cars/new">View public</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      <NewCarEditInventoryDialog
        item={editItem}
        open={Boolean(editItem)}
        onOpenChange={(o) => !o && setEditItem(null)}
        onSaved={() => {
          setEditItem(null);
          onChanged?.();
        }}
      />
    </>
  );
}

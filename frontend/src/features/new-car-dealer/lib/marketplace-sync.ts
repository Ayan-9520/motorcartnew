import { getVehicleHero } from "@/lib/media/vehicle-media-registry";
import { createVehicle, deleteVehicle, updateVehicle } from "@/services/vehicle.service";
import type { DealerProfile } from "@/features/dealer-crm/types";
import type { VehicleListing } from "@/types/vehicle";

export type NewCarStockInput = {
  brand: string;
  model: string;
  variant: string;
  fuelType: string;
  transmission: string;
  exShowroomPrice: number;
  onRoadPrice?: number;
  color?: string;
  imageUrl?: string;
  year?: number;
  description?: string;
};

/** Dual-write new-car stock to public `vehicles` table (/buy/cars/new). */
export async function syncNewCarToMarketplace(
  input: NewCarStockInput,
  sellerId: string,
  dealer: Pick<DealerProfile, "id" | "city" | "state">
) {
  const onRoad = input.onRoadPrice ?? Math.round(input.exShowroomPrice * 1.12);
  const images = input.imageUrl
    ? [input.imageUrl]
    : [getVehicleHero({ brand: input.brand, model: input.model, bodyType: "Sedan" })];

  return createVehicle(
    {
      title: `${input.brand} ${input.model} ${input.variant}`.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      variant: input.variant.trim(),
      year: input.year ?? new Date().getFullYear(),
      price: onRoad,
      originalPrice: input.exShowroomPrice,
      fuelType: input.fuelType,
      transmission: input.transmission,
      bodyType: "SUV",
      category: "new-cars",
      kmsDriven: 0,
      owners: 1,
      color: input.color ?? "White",
      city: dealer.city,
      state: dealer.state,
      description: input.description ?? `${input.brand} ${input.model} — brand new at showroom price.`,
      images,
      condition: "new",
      saleMode: "dealer_offer",
      metadata: { exShowroom: input.exShowroomPrice, onRoad } as VehicleListing["metadata"],
    },
    sellerId,
    dealer.id
  );
}

export async function updateMarketplaceVehicle(
  vehicleId: string,
  input: Partial<NewCarStockInput> & { stockStatus?: string }
) {
  const patch: Parameters<typeof updateVehicle>[1] = {};
  if (input.brand && input.model) {
    patch.title = `${input.brand} ${input.model} ${input.variant ?? ""}`.trim();
    patch.brand = input.brand;
    patch.model = input.model;
  }
  if (input.variant) patch.variant = input.variant;
  if (input.fuelType) patch.fuelType = input.fuelType;
  if (input.transmission) patch.transmission = input.transmission;
  if (input.onRoadPrice != null) patch.price = input.onRoadPrice;
  if (input.exShowroomPrice != null) patch.originalPrice = input.exShowroomPrice;
  if (input.imageUrl) patch.images = [input.imageUrl];
  if (input.stockStatus === "booked" || input.stockStatus === "delivered") patch.status = "sold";
  else if (input.stockStatus === "available") patch.status = "available";
  return updateVehicle(vehicleId, patch);
}

export { deleteVehicle };

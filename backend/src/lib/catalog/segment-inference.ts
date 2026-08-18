/** Infer catalog segment from marketplace listing category (internal only). */

const CATEGORY_SEGMENT: Record<string, string> = {
  cars: "car",
  "used-cars": "car",
  "new-cars": "car",
  bikes: "bike",
  scooters: "scooter",
  ev: "ev",
  trucks: "truck",
  bus: "bus",
  buses: "bus",
  pickup: "pickup",
  tractor: "tractor",
  "construction-equipment": "construction_equipment",
  "farm-equipment": "farm_equipment",
  "commercial-vehicles": "commercial_vehicle",
  auto: "auto",
  rickshaw: "rickshaw",
};

export function inferSegmentFromCategory(category: string | null | undefined): string {
  if (!category?.trim()) return "car";
  const key = category.trim().toLowerCase();
  return CATEGORY_SEGMENT[key] ?? "car";
}

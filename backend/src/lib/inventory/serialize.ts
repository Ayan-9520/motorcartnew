export type StockByPinSource = "new_car_inventory" | "vehicle";

export type StockByPinBranch = {
  id: string;
  name: string;
  pincode: string;
};

export type StockByPinItem = {
  source: StockByPinSource;
  inventoryId?: string;
  vehicleId?: string;
  dealerId: string;
  dealerName: string;
  city: string;
  state: string;
  branch?: StockByPinBranch;
  availability: "available";
  stock?: number;
  catalogVariantId?: string;
  brand?: string;
  model?: string;
  variant?: string;
  year?: number;
  title?: string;
  slug?: string;
  category?: string;
};

export type StockByPinResponse = {
  pincode: string;
  count: number;
  items: StockByPinItem[];
};

export type PublicDealer = {
  id: string;
  name: string;
  city: string;
  state: string;
};

const SECRET_KEYS = [
  "gstNumber",
  "gst_number",
  "panNumber",
  "pan_number",
  "passwordHash",
  "password_hash",
  "typeMetadata",
  "type_metadata",
  "metadata",
  "email",
  "phone",
  "contactNumber",
  "contact_number",
  "ownerId",
  "owner_id",
  "latitude",
  "longitude",
];

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function publicDealerFields(row: PublicDealer): Pick<StockByPinItem, "dealerId" | "dealerName" | "city" | "state"> {
  return {
    dealerId: row.id,
    dealerName: row.name,
    city: row.city,
    state: row.state,
  };
}

export function serializeInventoryItem(input: {
  inventoryId: string;
  dealer: PublicDealer;
  branch?: StockByPinBranch;
  stock: number;
  catalogVariantId?: string | null;
  brand: string;
  model: string;
  variant?: string | null;
  year?: number;
}): StockByPinItem {
  const item: StockByPinItem = {
    source: "new_car_inventory",
    inventoryId: input.inventoryId,
    ...publicDealerFields(input.dealer),
    availability: "available",
    stock: input.stock,
    brand: input.brand,
    model: input.model,
  };
  if (input.branch) item.branch = input.branch;
  const catalogVariantId = optionalString(input.catalogVariantId);
  if (catalogVariantId) item.catalogVariantId = catalogVariantId;
  const variant = optionalString(input.variant);
  if (variant) item.variant = variant;
  if (input.year) item.year = input.year;
  return item;
}

export function serializeVehicleItem(input: {
  vehicleId: string;
  dealer: PublicDealer;
  branch?: StockByPinBranch;
  catalogVariantId?: string | null;
  brand: string;
  model: string;
  variant?: string | null;
  year?: number;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
}): StockByPinItem {
  const item: StockByPinItem = {
    source: "vehicle",
    vehicleId: input.vehicleId,
    ...publicDealerFields(input.dealer),
    availability: "available",
    brand: input.brand,
    model: input.model,
  };
  if (input.branch) item.branch = input.branch;
  const catalogVariantId = optionalString(input.catalogVariantId);
  if (catalogVariantId) item.catalogVariantId = catalogVariantId;
  const variant = optionalString(input.variant);
  if (variant) item.variant = variant;
  if (input.year) item.year = input.year;
  const title = optionalString(input.title);
  if (title) item.title = title;
  const slug = optionalString(input.slug);
  if (slug) item.slug = slug;
  const category = optionalString(input.category);
  if (category) item.category = category;
  return item;
}

export function emptyStockByPinResponse(pincode: string): StockByPinResponse {
  return { pincode, count: 0, items: [] };
}

export function assertPublicSafeItem(item: StockByPinItem): void {
  const blob = JSON.stringify(item);
  for (const key of SECRET_KEYS) {
    if (blob.includes(`"${key}"`)) {
      throw new Error(`Public stock item leaked ${key}`);
    }
  }
}

export function safeBranch(
  branches: Array<{ id: string; name: string; pincode: string }>,
): StockByPinBranch | undefined {
  if (branches.length !== 1) return undefined;
  return branches[0];
}

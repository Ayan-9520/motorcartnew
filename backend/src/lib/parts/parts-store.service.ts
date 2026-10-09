import { Prisma, type Part, type PartOrder } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { JwtPayload } from "@/lib/auth/jwt";
import { isPendingBusinessAccess, loadUserAccess } from "@/lib/auth/account-access";

/** Platform-fulfilled catalogue; orders for these SKUs are handled by admins. */
export const PARTS_DESK_SELLER_ID = "motorcart-parts-desk";
export const PARTS_DESK_NAME = "Motorcart Parts Desk";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const SELLER_ROLES = new Set([
  "parts_seller",
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "service_center",
  "service_partner",
]);

export const PART_CATEGORY_SLUGS = [
  "engine-parts",
  "battery",
  "tyres",
  "brake-parts",
  "accessories",
  "lubricants",
  "electronics",
  "body-parts",
  "interior-parts",
] as const;

const VEHICLE_HUBS = new Set(["cars", "bikes", "trucks", "buses", "ev", "auto"]);
const PART_ORIGINS = new Set(["oem", "aftermarket", "genuine_accessory"]);
export const PART_ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
export type PartOrderStatus = (typeof PART_ORDER_STATUSES)[number];

const NEXT_STATUS: Record<PartOrderStatus, PartOrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;
const MAX_LINES = 30;
const MAX_QTY = 500;

export type StoreResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; status?: number };
const fail = (error: string, status = 400): StoreResult<never> => ({ ok: false, error, status });

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asMeta(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asStringArray(v: unknown, max = 30): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 120)).slice(0, max) : [];
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function isAdmin(auth: JwtPayload | null): boolean {
  return !!auth && ADMIN_ROLES.has(auth.role);
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                            */
/* ------------------------------------------------------------------ */

export function serializePart(row: Part) {
  const meta = asMeta(row.metadata);
  const hubs = asStringArray(meta.vehicle_hubs).filter((h) => VEHICLE_HUBS.has(h));
  const origin = typeof meta.part_origin === "string" && PART_ORIGINS.has(meta.part_origin) ? meta.part_origin : "aftermarket";
  const sellerName =
    row.sellerId === PARTS_DESK_SELLER_ID ? PARTS_DESK_NAME : typeof meta.seller_name === "string" ? meta.seller_name : null;
  return {
    id: row.id,
    sellerId: row.sellerId,
    sellerName,
    name: row.name,
    slug: row.slug,
    categorySlug: row.category,
    brand: row.brand,
    price: Number(row.price),
    originalPrice: row.originalPrice == null ? null : Number(row.originalPrice),
    mrp: num(meta.mrp) ?? (row.originalPrice == null ? null : Number(row.originalPrice)),
    wholesalePrice: num(meta.wholesale_price),
    gstRate: num(meta.gst_rate) ?? 18,
    bulkMinQty: Math.max(1, Math.round(num(meta.bulk_min_qty) ?? 1)),
    stock: row.stock,
    rating: Number(row.rating),
    reviewCount: row.reviewCount,
    images: asStringArray(row.images, 6),
    compatibility: asStringArray(row.compatibility, 40),
    vehicleHubs: hubs.length ? hubs : undefined,
    isFeatured: row.isFeatured,
    isActive: row.isActive,
    description: typeof meta.description === "string" ? meta.description : null,
    sku: row.sku,
    supplierSku: typeof meta.supplier_sku === "string" ? meta.supplier_sku : null,
    hsnCode: typeof meta.hsn_code === "string" ? meta.hsn_code : null,
    partOrigin: origin,
    createdAt: row.createdAt.toISOString(),
  };
}

export type CatalogFilters = {
  category?: string | null;
  q?: string | null;
  hub?: string | null;
  origin?: string | null;
  featured?: boolean;
  limit?: number;
};

export async function listCatalog(filters: CatalogFilters) {
  const blocked = await blockedSellerIds();
  const where: Prisma.PartWhereInput = { isActive: true, ...(blocked.length ? { sellerId: { notIn: blocked } } : {}) };
  if (filters.category && (PART_CATEGORY_SLUGS as readonly string[]).includes(filters.category)) where.category = filters.category;
  if (filters.featured) where.isFeatured = true;
  const q = str(filters.q, 80);
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.part.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { stock: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(filters.limit ?? 200, 1), 500),
  });
  let list = rows.map(serializePart);
  if (q) {
    const needle = q.toLowerCase();
    const extra = await prisma.part.findMany({
      where: { isActive: true, ...(blocked.length ? { sellerId: { notIn: blocked } } : {}) },
      take: 500,
    });
    const seen = new Set(list.map((p) => p.id));
    for (const p of extra.map(serializePart)) {
      if (!seen.has(p.id) && p.compatibility.some((c) => c.toLowerCase().includes(needle))) list.push(p);
    }
  }
  if (filters.hub && VEHICLE_HUBS.has(filters.hub)) {
    list = list.filter((p) => !p.vehicleHubs || p.vehicleHubs.includes(filters.hub!));
  }
  if (filters.origin && PART_ORIGINS.has(filters.origin)) list = list.filter((p) => p.partOrigin === filters.origin);
  return list;
}

export async function getCatalogPart(slug: string) {
  const row = await prisma.part.findUnique({ where: { slug: str(slug, 160) } });
  if (!row || !row.isActive) return null;
  if ((await blockedSellerIds()).includes(row.sellerId)) return null;
  return serializePart(row);
}

/* ------------------------------------------------------------------ */
/* Pricing                                                              */
/* ------------------------------------------------------------------ */

export type PricedLine = {
  partId: string;
  partName: string;
  slug: string;
  categorySlug: string;
  sellerId: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  lineSubtotal: number;
  lineGst: number;
  lineTotal: number;
  hsnCode: string | null;
  wholesaleApplied: boolean;
};

/** Prices are GST-inclusive; wholesale unit price applies once qty reaches the bulk MOQ. */
export function priceLine(part: ReturnType<typeof serializePart>, qty: number): PricedLine {
  const wholesaleApplied = part.wholesalePrice != null && part.bulkMinQty > 1 && qty >= part.bulkMinQty && part.wholesalePrice < part.price;
  const unitPrice = wholesaleApplied ? part.wholesalePrice! : part.price;
  const lineTotal = Math.round(unitPrice * qty * 100) / 100;
  const lineSubtotal = Math.round((lineTotal / (1 + part.gstRate / 100)) * 100) / 100;
  const lineGst = Math.round((lineTotal - lineSubtotal) * 100) / 100;
  return {
    partId: part.id,
    partName: part.name,
    slug: part.slug,
    categorySlug: part.categorySlug,
    sellerId: part.sellerId,
    qty,
    unitPrice,
    gstRate: part.gstRate,
    lineSubtotal,
    lineGst,
    lineTotal,
    hsnCode: part.hsnCode,
    wholesaleApplied,
  };
}

/* ------------------------------------------------------------------ */
/* Checkout                                                             */
/* ------------------------------------------------------------------ */

type TimelineEntry = { status: string; at: string; note?: string; by?: string };

function invoiceNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `MC-PRT-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

class CheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

async function notifyUsers(userIds: string[], title: string, body: string, payload: Record<string, unknown>) {
  const ids = [...new Set(userIds)].filter((id) => id && id !== PARTS_DESK_SELLER_ID);
  if (!ids.length) return;
  await prisma.notification
    .createMany({
      data: ids.map((userId) => ({ userId, title, body, message: body, kind: "parts", payload: payload as Prisma.InputJsonValue })),
    })
    .catch(() => undefined);
}

async function adminUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "admin"] }, deletedAt: null },
    select: { id: true },
    take: 50,
  });
  return users.map((u) => u.id);
}

export type CheckoutInput = {
  items?: unknown;
  paymentMethod?: unknown;
  shipping?: unknown;
  gstin?: unknown;
};

export async function checkoutParts(auth: JwtPayload, input: CheckoutInput): Promise<StoreResult> {
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const qtyById = new Map<string, number>();
  for (const it of rawItems) {
    const o = (it ?? {}) as Record<string, unknown>;
    const id = str(o.partId ?? o.part_id, 64);
    const qty = Math.floor(Number(o.qty));
    if (!id || !Number.isFinite(qty) || qty < 1) continue;
    qtyById.set(id, Math.min((qtyById.get(id) ?? 0) + qty, MAX_QTY));
  }
  if (!qtyById.size) return fail("Your cart is empty.");
  if (qtyById.size > MAX_LINES) return fail(`Maximum ${MAX_LINES} different parts per order.`);

  const paymentMethod = str(input.paymentMethod, 20);
  if (paymentMethod !== "cod" && paymentMethod !== "whatsapp") {
    return fail("Choose Cash on Delivery or WhatsApp confirmation — online payment is not live yet.");
  }

  const s = (input.shipping ?? {}) as Record<string, unknown>;
  const shipping = {
    name: str(s.name, 80),
    phone: str(s.phone, 15).replace(/\D/g, "").slice(-10),
    line1: str(s.line1, 200),
    line2: str(s.line2, 200),
    landmark: str(s.landmark, 120),
    city: str(s.city, 60),
    state: str(s.state, 60),
    pin: str(s.pin, 6),
  };
  if (shipping.name.length < 2) return fail("Enter the receiver's full name.");
  if (!PHONE_RE.test(shipping.phone)) return fail("Enter a valid 10-digit mobile number.");
  if (shipping.line1.length < 5) return fail("Enter the full delivery address.");
  if (!shipping.city || !shipping.state) return fail("Enter city and state.");
  if (!PINCODE_RE.test(shipping.pin)) return fail("Enter a valid 6-digit PIN code.");
  const gstin = str(input.gstin, 15).toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return fail("GSTIN format looks wrong.");

  const blocked = new Set(await blockedSellerIds());
  try {
    const order = await prisma.$transaction(async (tx) => {
      const parts = await tx.part.findMany({ where: { id: { in: [...qtyById.keys()] } } });
      const byId = new Map(parts.map((p) => [p.id, p]));
      const lines: PricedLine[] = [];
      for (const [id, qty] of qtyById) {
        const row = byId.get(id);
        if (!row || !row.isActive || blocked.has(row.sellerId)) {
          throw new CheckoutError("One of the parts in your cart is no longer available. Remove it and try again.", 409);
        }
        if (row.sellerId === auth.sub) throw new CheckoutError(`“${row.name}” is your own listing — you can't order it.`, 409);
        const updated = await tx.part.updateMany({ where: { id, isActive: true, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
        if (updated.count === 0) {
          throw new CheckoutError(row.stock > 0 ? `Only ${row.stock} left of “${row.name}”. Reduce the quantity.` : `“${row.name}” just went out of stock.`, 409);
        }
        lines.push(priceLine(serializePart(row), qty));
      }

      const subtotal = Math.round(lines.reduce((t, l) => t + l.lineSubtotal, 0) * 100) / 100;
      const gstTotal = Math.round(lines.reduce((t, l) => t + l.lineGst, 0) * 100) / 100;
      const grandTotal = Math.round(lines.reduce((t, l) => t + l.lineTotal, 0) * 100) / 100;
      const sellerIds = [...new Set(lines.map((l) => l.sellerId))];
      const now = new Date().toISOString();
      const invoice = invoiceNumber();

      const created = await tx.partOrder.create({
        data: {
          buyerId: auth.sub,
          sellerId: sellerIds.length === 1 ? sellerIds[0] : null,
          status: "pending",
          total: grandTotal,
          metadata: {
            invoice_number: invoice,
            payment_method: paymentMethod,
            cod: paymentMethod === "cod",
            shipping,
            gstin: gstin || null,
            subtotal,
            gst_total: gstTotal,
            grand_total: grandTotal,
            seller_ids: sellerIds,
            items: lines,
            timeline: [{ status: "pending", at: now, note: "Order placed" }],
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.partOrderItem.createMany({
        data: lines.map((l) => ({ orderId: created.id, productId: l.partId, qty: l.qty, price: l.unitPrice })),
      });
      return { created, sellerIds, invoice, grandTotal };
    });

    const admins = await adminUserIds();
    const sellerUsers = order.sellerIds.filter((id) => id !== PARTS_DESK_SELLER_ID);
    await notifyUsers(
      [...sellerUsers, ...(order.sellerIds.includes(PARTS_DESK_SELLER_ID) ? admins : [])],
      "New parts order",
      `Order ${order.invoice} — ₹${order.grandTotal.toLocaleString("en-IN")} (${paymentMethod === "cod" ? "COD" : "WhatsApp confirm"}). Confirm and pack it.`,
      { orderId: order.created.id, link: "/dashboard/parts/orders" },
    );
    await notifyUsers([auth.sub], "Order placed", `We received order ${order.invoice}. You'll get an update once the seller confirms it.`, {
      orderId: order.created.id,
      link: `/orders/${order.created.id}`,
    });

    return { ok: true, data: serializeOrder(await loadOrder(order.created.id)) };
  } catch (e) {
    if (e instanceof CheckoutError) return fail(e.message, e.status);
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Orders                                                               */
/* ------------------------------------------------------------------ */

async function loadOrder(id: string) {
  return prisma.partOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
}

export function serializeOrder(row: PartOrder & { items?: { id: string; productId: string; qty: number; price: Prisma.Decimal }[] }) {
  const meta = asMeta(row.metadata);
  const snapshot = Array.isArray(meta.items) ? (meta.items as PricedLine[]) : [];
  const items = snapshot.length
    ? snapshot.map((l, i) => ({
        id: `${row.id}-${i}`,
        partId: l.partId,
        partName: l.partName,
        slug: l.slug,
        categorySlug: l.categorySlug,
        sellerId: l.sellerId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        gstRate: l.gstRate,
        lineSubtotal: l.lineSubtotal,
        lineGst: l.lineGst,
        lineTotal: l.lineTotal,
        hsnCode: l.hsnCode ?? null,
      }))
    : (row.items ?? []).map((it) => {
        const unit = Number(it.price);
        const lineTotal = unit * it.qty;
        const lineSubtotal = Math.round((lineTotal / 1.18) * 100) / 100;
        return {
          id: it.id,
          partId: it.productId,
          partName: undefined,
          slug: undefined,
          categorySlug: undefined,
          sellerId: row.sellerId ?? "",
          qty: it.qty,
          unitPrice: unit,
          gstRate: 18,
          lineSubtotal,
          lineGst: Math.round((lineTotal - lineSubtotal) * 100) / 100,
          lineTotal,
          hsnCode: null,
        };
      });
  const grandTotal = num(meta.grand_total) ?? Number(row.total);
  return {
    id: row.id,
    userId: row.buyerId,
    status: (PART_ORDER_STATUSES as readonly string[]).includes(row.status) ? row.status : "pending",
    paymentMethod: typeof meta.payment_method === "string" ? meta.payment_method : "cod",
    codConfirmed: meta.cod === true,
    subtotal: num(meta.subtotal) ?? items.reduce((t, i) => t + i.lineSubtotal, 0),
    gstTotal: num(meta.gst_total) ?? items.reduce((t, i) => t + i.lineGst, 0),
    grandTotal,
    shippingAddress: asMeta(meta.shipping as Prisma.JsonValue),
    gstin: typeof meta.gstin === "string" ? meta.gstin : null,
    trackingNumber: typeof meta.tracking_number === "string" ? meta.tracking_number : null,
    carrier: typeof meta.carrier === "string" ? meta.carrier : null,
    invoiceNumber: typeof meta.invoice_number === "string" ? meta.invoice_number : null,
    invoiceSnapshot: { subtotal: num(meta.subtotal), gst_total: num(meta.gst_total), grand_total: grandTotal },
    timeline: Array.isArray(meta.timeline) ? (meta.timeline as TimelineEntry[]) : [],
    sellerIds: asStringArray(meta.seller_ids),
    items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMyOrders(auth: JwtPayload) {
  const rows = await prisma.partOrder.findMany({
    where: { buyerId: auth.sub },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(serializeOrder);
}

export async function getMyOrder(auth: JwtPayload, id: string) {
  const row = await prisma.partOrder.findUnique({ where: { id: str(id, 64) }, include: { items: true } });
  if (!row) return null;
  if (row.buyerId !== auth.sub && !isAdmin(auth) && !(await sellerOwnsOrder(auth, row))) return null;
  return serializeOrder(row);
}

function orderSellerIds(row: PartOrder): string[] {
  const ids = asStringArray(asMeta(row.metadata).seller_ids);
  if (ids.length) return ids;
  return row.sellerId ? [row.sellerId] : [];
}

async function sellerOwnsOrder(auth: JwtPayload, row: PartOrder): Promise<boolean> {
  return orderSellerIds(row).includes(auth.sub);
}

async function restock(tx: Prisma.TransactionClient, row: PartOrder & { items: { productId: string; qty: number }[] }) {
  for (const it of row.items) {
    await tx.part.update({ where: { id: it.productId }, data: { stock: { increment: it.qty } } }).catch(() => undefined);
  }
}

async function applyStatus(
  row: PartOrder & { items: { productId: string; qty: number }[] },
  next: PartOrderStatus,
  by: string,
  extra: { note?: string; trackingNumber?: string; carrier?: string } = {},
) {
  const meta = asMeta(row.metadata);
  const timeline = Array.isArray(meta.timeline) ? (meta.timeline as TimelineEntry[]) : [];
  const nextMeta: Record<string, unknown> = {
    ...meta,
    timeline: [...timeline, { status: next, at: new Date().toISOString(), note: extra.note, by }].slice(-40),
  };
  if (extra.trackingNumber) nextMeta.tracking_number = extra.trackingNumber;
  if (extra.carrier) nextMeta.carrier = extra.carrier;
  return prisma.$transaction(async (tx) => {
    if (next === "cancelled") await restock(tx, row);
    return tx.partOrder.update({
      where: { id: row.id },
      data: {
        status: next,
        fulfillmentStatus: next === "delivered" ? "FULFILLED" : next === "shipped" ? "IN_TRANSIT" : next === "cancelled" ? "CANCELLED" : "UNFULFILLED",
        metadata: nextMeta as Prisma.InputJsonValue,
      },
      include: { items: true },
    });
  });
}

export async function cancelMyOrder(auth: JwtPayload, id: string, reason?: string): Promise<StoreResult> {
  const row = await prisma.partOrder.findUnique({ where: { id: str(id, 64) }, include: { items: true } });
  if (!row || row.buyerId !== auth.sub) return fail("Order not found", 404);
  if (row.status !== "pending" && row.status !== "confirmed") {
    return fail("This order is already packed or shipped — contact the parts desk to cancel.", 409);
  }
  const updated = await applyStatus(row, "cancelled", "buyer", { note: str(reason, 200) || "Cancelled by customer" });
  const sellers = orderSellerIds(row);
  await notifyUsers(
    [...sellers, ...(sellers.includes(PARTS_DESK_SELLER_ID) ? await adminUserIds() : [])],
    "Parts order cancelled",
    `Order ${asMeta(row.metadata).invoice_number ?? row.id.slice(0, 8)} was cancelled by the customer.`,
    { orderId: row.id, link: "/dashboard/parts/orders" },
  );
  return { ok: true, data: serializeOrder(updated) };
}

export async function listSellerOrders(auth: JwtPayload) {
  const admin = isAdmin(auth);
  const rows = await prisma.partOrder.findMany({
    where: admin ? {} : { OR: [{ sellerId: auth.sub }, { metadata: { path: ["seller_ids"], array_contains: [auth.sub] } }] },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serializeOrder);
}

export type SellerOrderUpdate = { status?: unknown; trackingNumber?: unknown; carrier?: unknown; note?: unknown };

export async function updateSellerOrder(auth: JwtPayload, id: string, body: SellerOrderUpdate): Promise<StoreResult> {
  const row = await prisma.partOrder.findUnique({ where: { id: str(id, 64) }, include: { items: true } });
  if (!row) return fail("Order not found", 404);
  const sellers = orderSellerIds(row);
  const allowed = isAdmin(auth) || sellers.includes(auth.sub);
  if (!allowed) return fail("You can only update orders for your own parts", 403);

  const current = (PART_ORDER_STATUSES as readonly string[]).includes(row.status) ? (row.status as PartOrderStatus) : "pending";
  const next = str(body.status, 20) as PartOrderStatus;
  if (!NEXT_STATUS[current].includes(next)) return fail(`Order is ${current} — it can't move to ${next || "that status"}.`, 409);
  const trackingNumber = str(body.trackingNumber, 60);
  const carrier = str(body.carrier, 60);
  if (next === "shipped" && (!trackingNumber || !carrier)) return fail("Add courier name and tracking number to mark as shipped.");

  const updated = await applyStatus(row, next, isAdmin(auth) ? "admin" : "seller", {
    note: str(body.note, 200) || undefined,
    trackingNumber: trackingNumber || undefined,
    carrier: carrier || undefined,
  });
  const invoice = asMeta(row.metadata).invoice_number ?? row.id.slice(0, 8);
  const messages: Record<PartOrderStatus, string> = {
    pending: "",
    confirmed: `Order ${invoice} is confirmed and being prepared.`,
    packed: `Order ${invoice} is packed and ready to ship.`,
    shipped: `Order ${invoice} has shipped via ${carrier} — tracking ${trackingNumber}.`,
    delivered: `Order ${invoice} was delivered. Rate the parts you bought!`,
    cancelled: `Order ${invoice} was cancelled by the seller. Any COD amount will not be collected.`,
  };
  await notifyUsers([row.buyerId], "Parts order update", messages[next], { orderId: row.id, link: `/orders/${row.id}` });
  return { ok: true, data: serializeOrder(updated) };
}

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

export async function listPartReviews(partId: string) {
  const rows = await prisma.review.findMany({
    where: { entityType: "part", entityId: str(partId, 64) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId ?? "",
    rating: r.rating,
    title: r.title,
    content: r.comment,
    verifiedPurchase: asMeta(r.metadata).verified_purchase === true,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createPartReview(auth: JwtPayload, slug: string, body: Record<string, unknown>): Promise<StoreResult> {
  const part = await prisma.part.findUnique({ where: { slug: str(slug, 160) } });
  if (!part) return fail("Part not found", 404);
  const rating = Math.round(Number(body.rating));
  if (!(rating >= 1 && rating <= 5)) return fail("Choose a rating from 1 to 5.");
  const title = str(body.title, 120);
  const content = str(body.content, 1500);
  if (content.length < 10) return fail("Write at least a short review (10+ characters).");

  const existing = await prisma.review.findFirst({ where: { entityType: "part", entityId: part.id, userId: auth.sub } });
  if (existing) return fail("You have already reviewed this part.", 409);

  const delivered = await prisma.partOrder.findFirst({
    where: { buyerId: auth.sub, status: "delivered", items: { some: { productId: part.id } } },
    select: { id: true },
  });

  const review = await prisma.review.create({
    data: {
      userId: auth.sub,
      entityType: "part",
      entityId: part.id,
      rating,
      title: title || null,
      comment: content,
      metadata: { verified_purchase: !!delivered } as Prisma.InputJsonValue,
    },
  });
  const agg = await prisma.review.aggregate({ where: { entityType: "part", entityId: part.id }, _avg: { rating: true }, _count: true });
  await prisma.part.update({
    where: { id: part.id },
    data: { rating: Math.round((agg._avg.rating ?? rating) * 100) / 100, reviewCount: agg._count },
  });
  return {
    ok: true,
    data: {
      id: review.id,
      userId: auth.sub,
      rating,
      title: review.title,
      content: review.comment,
      verifiedPurchase: !!delivered,
      createdAt: review.createdAt.toISOString(),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Seller listings                                                      */
/* ------------------------------------------------------------------ */

export function canSellParts(auth: JwtPayload | null): boolean {
  return !!auth && (isAdmin(auth) || SELLER_ROLES.has(auth.role));
}

/** Role check plus live account state: only active, admin-approved business accounts may sell. */
export async function sellerAccessError(auth: JwtPayload | null): Promise<string | null> {
  if (!auth || !canSellParts(auth)) return "Parts seller access required";
  if (isAdmin(auth)) return null;
  const user = await loadUserAccess(auth.sub);
  if (!user || !SELLER_ROLES.has(user.role)) return "Parts seller access required";
  if (user.status === "suspended" || user.status === "closed") return "Your seller account is suspended. Contact MotorCart support.";
  if (isPendingBusinessAccess(user)) return "Your business account is awaiting MotorCart approval. You can list parts once it is approved.";
  return null;
}

/** Sellers whose listings must not be shown or sold (suspended, closed or deleted accounts). */
async function blockedSellerIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { OR: [{ status: { in: ["suspended", "closed"] } }, { deletedAt: { not: null } }] },
    select: { id: true },
    take: 5000,
  });
  return rows.map((r) => r.id);
}

async function sellerDisplayName(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyName: true, fullName: true } });
  if (!user) return null;
  const name = user.companyName?.trim() || user.fullName?.trim();
  return name ? name.slice(0, 120) : null;
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

type ListingInput = Record<string, unknown>;

function parseListing(body: ListingInput, partial: boolean): StoreResult<{ fields: Prisma.PartUncheckedUpdateInput; meta: Record<string, unknown> }> {
  const fields: Prisma.PartUncheckedUpdateInput = {};
  const meta: Record<string, unknown> = {};

  if (!partial || body.name !== undefined) {
    const name = str(body.name, 160);
    if (name.length < 3) return fail("Part name is too short.");
    fields.name = name;
  }
  if (!partial || body.category !== undefined) {
    const category = str(body.category, 40);
    if (!(PART_CATEGORY_SLUGS as readonly string[]).includes(category)) return fail("Choose a valid category.");
    fields.category = category;
  }
  if (!partial || body.price !== undefined) {
    const price = Math.round(Number(body.price));
    if (!(price >= 1 && price <= 5_000_000)) return fail("Enter a selling price in rupees.");
    fields.price = BigInt(price);
  }
  if (!partial || body.stock !== undefined) {
    const stock = Math.floor(Number(body.stock));
    if (!(stock >= 0 && stock <= 1_000_000)) return fail("Stock must be 0 or more.");
    fields.stock = stock;
  }
  if (body.brand !== undefined) fields.brand = str(body.brand, 80) || null;
  if (body.sku !== undefined) fields.sku = str(body.sku, 60) || null;
  if (body.isActive !== undefined) fields.isActive = body.isActive === true;
  if (body.compatibility !== undefined) fields.compatibility = asStringArray(body.compatibility, 40) as Prisma.InputJsonValue;
  if (body.images !== undefined) {
    fields.images = asStringArray(body.images, 6).filter((u) => /^(\/uploads\/|https:\/\/)/.test(u)) as Prisma.InputJsonValue;
  }
  if (body.mrp !== undefined) {
    const mrp = num(body.mrp);
    meta.mrp = mrp && mrp > 0 ? Math.round(mrp) : null;
    fields.originalPrice = mrp && mrp > 0 ? BigInt(Math.round(mrp)) : null;
  }
  if (body.wholesalePrice !== undefined) {
    const w = num(body.wholesalePrice);
    meta.wholesale_price = w && w > 0 ? Math.round(w) : null;
  }
  if (body.gstRate !== undefined) {
    const g = num(body.gstRate);
    if (g == null || ![0, 5, 12, 18, 28].includes(g)) return fail("GST rate must be 0, 5, 12, 18 or 28%.");
    meta.gst_rate = g;
  }
  if (body.bulkMinQty !== undefined) meta.bulk_min_qty = Math.max(1, Math.floor(num(body.bulkMinQty) ?? 1));
  if (body.partOrigin !== undefined) {
    const o = str(body.partOrigin, 30);
    if (!PART_ORIGINS.has(o)) return fail("Choose OEM, aftermarket or genuine accessory.");
    meta.part_origin = o;
  }
  if (body.vehicleHubs !== undefined) meta.vehicle_hubs = asStringArray(body.vehicleHubs, 6).filter((h) => VEHICLE_HUBS.has(h));
  if (body.description !== undefined) meta.description = str(body.description, 2000) || null;
  if (body.hsnCode !== undefined) meta.hsn_code = str(body.hsnCode, 10) || null;
  return { ok: true, data: { fields, meta } };
}

export async function listSellerListings(auth: JwtPayload) {
  const rows = await prisma.part.findMany({
    where: isAdmin(auth) ? { sellerId: { in: [auth.sub, PARTS_DESK_SELLER_ID] } } : { sellerId: auth.sub },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return rows.filter((r) => asMeta(r.metadata).archived !== true).map(serializePart);
}

export async function createSellerListing(auth: JwtPayload, body: ListingInput): Promise<StoreResult> {
  if (!canSellParts(auth)) return fail("Only approved parts sellers can list parts.", 403);
  const parsed = parseListing(body, false);
  if (!parsed.ok) return parsed;
  const { fields, meta } = parsed.data;
  const base = slugify(`${fields.brand ?? ""} ${fields.name}`) || "part";
  let slug = base;
  for (let i = 0; await prisma.part.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
    if (i > 5) return fail("Could not create a unique link for this part — change the name slightly.", 409);
  }
  const sellerId = isAdmin(auth) && body.asPartsDesk === true ? PARTS_DESK_SELLER_ID : auth.sub;
  if (sellerId !== PARTS_DESK_SELLER_ID) {
    const sellerName = await sellerDisplayName(sellerId);
    if (sellerName) meta.seller_name = sellerName;
  }
  const row = await prisma.part.create({
    data: {
      sellerId,
      name: String(fields.name),
      slug,
      category: String(fields.category),
      brand: (fields.brand as string | null | undefined) ?? null,
      price: fields.price as bigint,
      originalPrice: (fields.originalPrice as bigint | null | undefined) ?? null,
      stock: Number(fields.stock),
      sku: (fields.sku as string | null | undefined) ?? null,
      images: (fields.images as Prisma.InputJsonValue | undefined) ?? [],
      compatibility: (fields.compatibility as Prisma.InputJsonValue | undefined) ?? [],
      isFeatured: false,
      isActive: true,
      metadata: { gst_rate: 18, bulk_min_qty: 1, part_origin: "aftermarket", ...meta } as Prisma.InputJsonValue,
    },
  });
  return { ok: true, data: serializePart(row) };
}

export async function updateSellerListing(auth: JwtPayload, id: string, body: ListingInput): Promise<StoreResult> {
  const row = await prisma.part.findUnique({ where: { id: str(id, 64) } });
  if (!row) return fail("Part not found", 404);
  const owns = row.sellerId === auth.sub || isAdmin(auth);
  if (!owns) return fail("You can only edit your own parts", 403);
  if (asMeta(row.metadata).archived === true) return fail("This part was deleted.", 404);
  const parsed = parseListing(body, true);
  if (!parsed.ok) return parsed;
  const { fields, meta } = parsed.data;
  if (isAdmin(auth) && body.isFeatured !== undefined) fields.isFeatured = body.isFeatured === true;
  const updated = await prisma.part.update({
    where: { id: row.id },
    data: { ...fields, metadata: { ...asMeta(row.metadata), ...meta } as Prisma.InputJsonValue },
  });
  return { ok: true, data: serializePart(updated) };
}

/** Parts with order history are archived (kept for invoices); unsold parts are removed outright. */
export async function deleteSellerListing(auth: JwtPayload, id: string): Promise<StoreResult<{ id: string; archived: boolean }>> {
  const row = await prisma.part.findUnique({ where: { id: str(id, 64) } });
  if (!row) return fail("Part not found", 404);
  const owns = row.sellerId === auth.sub || isAdmin(auth);
  if (!owns) return fail("You can only delete your own parts", 403);
  const sold = await prisma.partOrderItem.count({ where: { productId: row.id } });
  if (sold > 0) {
    await prisma.part.update({
      where: { id: row.id },
      data: {
        isActive: false,
        isFeatured: false,
        metadata: { ...asMeta(row.metadata), archived: true, archived_at: new Date().toISOString() } as Prisma.InputJsonValue,
      },
    });
    return { ok: true, data: { id: row.id, archived: true } };
  }
  await prisma.part.delete({ where: { id: row.id } });
  return { ok: true, data: { id: row.id, archived: false } };
}

const MAX_BULK_ROWS = 500;

export async function bulkCreateSellerListings(auth: JwtPayload, rows: unknown) {
  if (!Array.isArray(rows) || rows.length === 0) return fail("No rows found in the sheet.");
  if (rows.length > MAX_BULK_ROWS) return fail(`Upload at most ${MAX_BULK_ROWS} parts per sheet.`);
  const results: { row: number; ok: boolean; id?: string; name?: string; error?: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const input = rows[i] && typeof rows[i] === "object" ? (rows[i] as ListingInput) : {};
    const res = await createSellerListing(auth, { ...input, asPartsDesk: false });
    if (res.ok) {
      const part = res.data as ReturnType<typeof serializePart>;
      results.push({ row: i + 1, ok: true, id: part.id, name: part.name });
    } else {
      results.push({ row: i + 1, ok: false, name: str(input.name, 160) || undefined, error: res.error });
    }
  }
  const created = results.filter((r) => r.ok).length;
  return { ok: true as const, data: { created, failed: results.length - created, results } };
}

export async function listSellerReviews(auth: JwtPayload) {
  const parts = await prisma.part.findMany({
    where: isAdmin(auth) ? { sellerId: { in: [auth.sub, PARTS_DESK_SELLER_ID] } } : { sellerId: auth.sub },
    select: { id: true, name: true, slug: true },
    take: 1000,
  });
  if (!parts.length) return [];
  const byId = new Map(parts.map((p) => [p.id, p]));
  const rows = await prisma.review.findMany({
    where: { entityType: "part", entityId: { in: parts.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return rows.map((r) => {
    const part = byId.get(r.entityId);
    return {
      id: r.id,
      partId: r.entityId,
      partName: part?.name ?? "Part",
      partSlug: part?.slug ?? null,
      rating: r.rating,
      title: r.title,
      content: r.comment,
      verifiedPurchase: asMeta(r.metadata).verified_purchase === true,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export type PosterTemplateId =
  | "new_car_offer"
  | "used_car_offer"
  | "exchange_bonus"
  | "insurance_offer"
  | "finance_offer"
  | "workshop_offer"
  | "parts_offer";

export type PosterTemplateDef = {
  id: PosterTemplateId;
  name: string;
  format: "poster" | "instagram_post" | "banner";
  width: number;
  height: number;
  accent: string;
  accentSecondary: string;
};

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  {
    id: "new_car_offer",
    name: "New Car Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#0f766e",
    accentSecondary: "#14b8a6",
  },
  {
    id: "used_car_offer",
    name: "Used Car Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#1d4ed8",
    accentSecondary: "#3b82f6",
  },
  {
    id: "exchange_bonus",
    name: "Exchange Bonus",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#b45309",
    accentSecondary: "#f59e0b",
  },
  {
    id: "insurance_offer",
    name: "Insurance Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#7c3aed",
    accentSecondary: "#a78bfa",
  },
  {
    id: "finance_offer",
    name: "Finance Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#047857",
    accentSecondary: "#34d399",
  },
  {
    id: "workshop_offer",
    name: "Workshop Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#be123c",
    accentSecondary: "#fb7185",
  },
  {
    id: "parts_offer",
    name: "Parts Offer",
    format: "poster",
    width: 1080,
    height: 1350,
    accent: "#4338ca",
    accentSecondary: "#818cf8",
  },
];

export function getPosterTemplate(id: string): PosterTemplateDef | undefined {
  return POSTER_TEMPLATES.find((t) => t.id === id);
}

export type PosterCanvasData = {
  templateId: PosterTemplateId;
  logoUrl?: string | null;
  vehicleImageUrl?: string | null;
  offerTitle: string;
  offerDescription: string;
  price: string;
  cta: string;
};

export const DEFAULT_POSTER_DATA: PosterCanvasData = {
  templateId: "new_car_offer",
  offerTitle: "Special Offer",
  offerDescription: "Limited time automotive promotion",
  price: "₹ —",
  cta: "Call Now",
};

import type { LucideIcon } from "lucide-react";
import { Car, CarFront, Gavel, Landmark, Store, ShoppingBag } from "lucide-react";

export type ExploreCta = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

/** Premium homepage — only the strongest entry points (no 18-tile clutter). */
export const HOME_EXPLORE_CTAS: ExploreCta[] = [
  {
    id: "new",
    title: "New Cars",
    description: "OEM prices · variants · offers",
    href: "/buy/cars/new",
    icon: Car,
  },
  {
    id: "used",
    title: "Pre-Owned",
    description: "Certified · inspected stock",
    href: "/buy/cars/used",
    icon: CarFront,
  },
  {
    id: "sell",
    title: "Sell",
    description: "Free listing in minutes",
    href: "/sell",
    icon: Store,
  },
  {
    id: "finance",
    title: "Finance",
    description: "EMI · banks & NBFCs",
    href: "/finance",
    icon: Landmark,
  },
  {
    id: "auctions",
    title: "Auctions",
    description: "Live bidding & repo",
    href: "/auctions",
    icon: Gavel,
  },
  {
    id: "buy",
    title: "Buy hub",
    description: "All segments in one place",
    href: "/buy",
    icon: ShoppingBag,
  },
];

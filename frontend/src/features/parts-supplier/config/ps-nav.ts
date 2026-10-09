import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  Percent,
  Settings,
  ShoppingCart,
  Star,
  Truck,
  Upload,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";

export type PsNavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type PsNavGroup = { label: string; items: PsNavItem[] };

export const PARTS_SUPPLIER_NAV: PsNavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard/parts", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/dashboard/parts/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Products",
    items: [
      { to: "/dashboard/parts/catalog", label: "All products", icon: Package },
      { to: "/dashboard/parts/upload", label: "Add product", icon: PackagePlus },
      { to: "/dashboard/parts/bulk-upload", label: "Bulk upload (Excel)", icon: Upload },
      { to: "/dashboard/parts/categories", label: "Categories", icon: Boxes },
      { to: "/dashboard/parts/brands", label: "Brands", icon: Building2 },
      { to: "/dashboard/parts/pricing", label: "Pricing", icon: Percent },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/dashboard/parts/inventory", label: "Stock & SKUs", icon: Warehouse },
      { to: "/dashboard/parts/low-stock", label: "Low stock", icon: AlertTriangle },
      { to: "/dashboard/parts/out-of-stock", label: "Out of stock", icon: PackageX },
    ],
  },
  {
    label: "Orders",
    items: [
      { to: "/dashboard/parts/orders", label: "All orders", icon: ShoppingCart, end: true },
      { to: "/dashboard/parts/orders/new", label: "New orders", icon: ClipboardList },
      { to: "/dashboard/parts/orders/processing", label: "To pack", icon: Package },
      { to: "/dashboard/parts/orders/packed", label: "Ready to ship", icon: PackageCheck },
      { to: "/dashboard/parts/orders/dispatched", label: "In transit", icon: Truck },
      { to: "/dashboard/parts/orders/delivered", label: "Delivered", icon: PackageCheck },
      { to: "/dashboard/parts/orders/cancelled", label: "Cancelled", icon: XCircle },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/dashboard/parts/finance/revenue", label: "Revenue & collections", icon: Landmark },
      { to: "/dashboard/parts/finance/invoices", label: "GST invoices", icon: FileSpreadsheet },
      { to: "/dashboard/parts/customers", label: "Customers", icon: Users },
      { to: "/dashboard/parts/reviews", label: "Ratings & reviews", icon: Star },
    ],
  },
  {
    label: "Settings",
    items: [{ to: "/dashboard/parts/profile", label: "Business profile & KYC", icon: Settings }],
  },
];

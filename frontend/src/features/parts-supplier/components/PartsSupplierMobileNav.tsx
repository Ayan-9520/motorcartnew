import { NavLink } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Package, ShoppingCart, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartsWorkspaceHomePath } from "../hooks/usePartsWorkspaceHomePath";

const mobileLinks = [
  { to: "/dashboard/parts", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/dashboard/parts/catalog", label: "Catalog", icon: Package },
  { to: "/dashboard/parts/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/parts/inventory", label: "Stock", icon: Warehouse },
];

export function PartsSupplierMobileNav() {
  const homePath = usePartsWorkspaceHomePath();
  const links = homePath
    ? [{ to: homePath, label: "My dashboard", icon: ArrowLeft, end: true }, ...mobileLinks]
    : mobileLinks;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
              isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

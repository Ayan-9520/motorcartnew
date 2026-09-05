import { NavLink } from "react-router-dom";
import { Bell, Car, Home, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard/customer", label: "Home", icon: Home, end: true },
  { to: "/dashboard/customer/garage", label: "Garage", icon: Car },
  { to: "/dashboard/customer/loans", label: "Finance", icon: Landmark },
  { to: "/dashboard/customer/notifications", label: "Alerts", icon: Bell },
  { to: "/dashboard/customer/insights", label: "Pulse", icon: Bell },
] as const;

/** Premium mobile bottom navigation for customer ownership OS */
export function CustomerBottomNav() {
  return (
    <nav className="cos-bottom-nav lg:hidden" aria-label="Customer navigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={"end" in tab ? tab.end : undefined}
          className={({ isActive }) =>
            cn("cos-bottom-nav__item", isActive && "cos-bottom-nav__item--active")
          }
        >
          <tab.icon className="h-5 w-5" aria-hidden />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

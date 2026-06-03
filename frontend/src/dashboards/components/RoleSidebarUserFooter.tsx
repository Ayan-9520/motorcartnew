import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { getRoleAccountPath, isAccountPath } from "@/auth/get-role-account-path";
import type { AppRole } from "@/types/database";

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  dealer: "Dealer",
  new_car_dealer: "New car dealer",
  used_car_dealer: "Used car dealer",
  bike_dealer: "Bike dealer",
  truck_dealer: "Truck dealer",
  parts_seller: "Parts seller",
  service_technician: "Mechanic",
  service_center: "Service center",
  auction_partner: "Auction partner",
  admin: "Administrator",
  super_admin: "Administrator",
  customer: "Member",
};

export function RoleSidebarUserFooter() {
  const { user } = useAuthStore();
  const { signOut, isLoading } = useAuth();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { pathname, hash } = useLocation();

  if (!user) return null;

  const role = user.role as AppRole;
  const accountHref = getRoleAccountPath(user);
  const accountActive = isAccountPath(pathname, hash, user);
  const roleLabel = ROLE_LABELS[role] ?? role.replace(/_/g, " ");
  const subtitle = [user.city, user.state].filter(Boolean).join(", ") || user.email;

  return (
    <div className="sidebar-user-foot">
      <Link
        to={accountHref}
        className={cn(
          "sidebar-user-card flex items-center gap-2.5 rounded-xl p-2.5 transition-colors",
          accountActive ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-muted/50",
          !sidebarOpen && "justify-center px-2"
        )}
        title="Open account & profile"
      >
        <span className="sidebar-user-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (user.fullName?.charAt(0) ?? "U").toUpperCase()
          )}
        </span>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        )}
      </Link>

      <Button
        type="button"
        variant={sidebarOpen ? "outline" : "ghost"}
        size={sidebarOpen ? "default" : "icon"}
        className={cn(
          "sidebar-sign-out-btn mt-2 w-full rounded-xl",
          sidebarOpen && "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
        disabled={isLoading}
        onClick={() => void signOut()}
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className={cn("h-4 w-4", sidebarOpen && "mr-2")} />
        {sidebarOpen && "Sign out"}
      </Button>
    </div>
  );
}

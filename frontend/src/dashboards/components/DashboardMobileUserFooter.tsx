import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { getRoleAccountPath } from "@/auth/get-role-account-path";
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

type Props = {
  onNavigate?: () => void;
};

/** Sticky account + sign-out block for mobile dashboard drawer menus. */
export function DashboardMobileUserFooter({ onNavigate }: Props) {
  const { user } = useAuthStore();
  const { signOut, isLoading } = useAuth();

  if (!user) return null;

  const role = user.role as AppRole;
  const accountHref = getRoleAccountPath(user);
  const roleLabel = ROLE_LABELS[role] ?? role.replace(/_/g, " ");
  const subtitle = [user.city, user.state].filter(Boolean).join(", ") || user.email;

  return (
    <div className="dashboard-mobile-foot shrink-0 border-t border-border/60 bg-card/95 p-3 backdrop-blur-md">
      <Link
        to={accountHref}
        onClick={onNavigate}
        className="sidebar-user-card flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted/50"
      >
        <span className="sidebar-user-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            (user.fullName?.charAt(0) ?? "U").toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </Link>

      <Button
        type="button"
        variant="outline"
        className="sidebar-sign-out-btn mt-2 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={isLoading}
        onClick={() => void signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

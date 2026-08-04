import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router-dom";
import {
  Bot,
  Car,
  Gavel,
  Heart,
  Home,
  Landmark,
  LogOut,
  Package,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { MotorcartLogo } from "@/components/brand/MotorcartLogo";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { VehicleHubIconBar } from "@/features/marketplace/components/VehicleHubIconBar";
import { NAV_LINKS, VEHICLE_HUB_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const NAV_ICONS: Record<string, LucideIcon> = {
  [VEHICLE_HUB_NAV.href]: Car,
  "/buy": ShoppingCart,
  "/sell": Tag,
  "/auctions": Gavel,
  "/finance": Landmark,
  "/insurance": Shield,
  "/parts": Package,
  "/services": Wrench,
  "/community": Users,
  "/ai": Bot,
  "/dealers": Store,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  hideVehicleHubBar: boolean;
  pathname: string;
  isNavLinkActive: (linkHref: string, isActive: boolean, pathname: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  workspaceHref: string;
  accountHref: string;
  wishlistCount: number;
  cartCount: number;
  onSignOut: () => void;
  accountTo: string;
};

const APP_SHORTCUTS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/buy", label: "Buy", icon: Car },
  { to: "/auctions", label: "Auctions", icon: Gavel },
  { to: "/finance", label: "Loans", icon: Landmark },
];

export function NavbarMobileDrawer({
  open,
  onClose,
  onSearch,
  hideVehicleHubBar,
  pathname,
  isNavLinkActive,
  isAuthenticated,
  isLoading,
  workspaceHref,
  accountHref,
  wishlistCount,
  cartCount,
  onSignOut,
  accountTo,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        className="nav-mobile-drawer-backdrop md:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className="nav-mobile-drawer md:hidden"
        aria-label="Mobile navigation menu"
        role="dialog"
        aria-modal="true"
      >
        <div className="nav-mobile-drawer-head">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Menu</p>
            <div className="mt-1 flex items-center gap-2">
              <MotorcartLogo variant="icon" height={22} />
              <span className="truncate text-sm font-semibold text-foreground">Motorcart</span>
            </div>
          </div>
          <button type="button" className="nav-icon-btn" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="nav-mobile-drawer-body">
          <nav className="nav-mobile-drawer-apps" aria-label="Quick app navigation">
            {APP_SHORTCUTS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn("nav-mobile-drawer-app", isActive && "nav-mobile-drawer-app-active")
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
            <NavLink
              to={accountTo}
              onClick={onClose}
              className={({ isActive }) =>
                cn("nav-mobile-drawer-app", isActive && "nav-mobile-drawer-app-active")
              }
            >
              <User className="h-4 w-4" />
              <span>Account</span>
            </NavLink>
          </nav>

          {!hideVehicleHubBar && (
            <div className="nav-mobile-drawer-section border-b border-border/60 pb-3">
              <p className="nav-mobile-drawer-label">Browse by vehicle</p>
              <VehicleHubIconBar variant="inline" onNavigate={onClose} />
            </div>
          )}

          <button
            type="button"
            className="nav-mobile-search"
            onClick={() => {
              onSearch();
              onClose();
            }}
          >
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1 text-left">Search Motorcart</span>
            <kbd className="nav-kbd">⌘K</kbd>
          </button>

          <nav className="nav-mobile-drawer-nav" aria-label="Site pages">
            {NAV_LINKS.map((link) => {
              const Icon = NAV_ICONS[link.href] ?? Sparkles;
              return (
                <NavLink
                  key={link.href}
                  to={link.href}
                  onClick={onClose}
                  end={
                    link.href === VEHICLE_HUB_NAV.href ? false : link.href === "/auctions" ? false : undefined
                  }
                  className={({ isActive }) =>
                    cn(
                      "nav-mobile-drawer-link",
                      isNavLinkActive(link.href, isActive, pathname) && "nav-mobile-drawer-link-active"
                    )
                  }
                >
                  <span className="nav-mobile-drawer-link-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="nav-mobile-drawer-quick">
            <Link to="/wishlist" className="nav-mobile-drawer-quick-btn" onClick={onClose}>
              <Heart className={cn("h-4 w-4", wishlistCount > 0 && "fill-primary text-primary")} />
              Wishlist
              {wishlistCount > 0 && (
                <span className="nav-mobile-drawer-badge">{wishlistCount > 9 ? "9+" : wishlistCount}</span>
              )}
            </Link>
            <Link to="/cart" className="nav-mobile-drawer-quick-btn" onClick={onClose}>
              <ShoppingCart className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="nav-mobile-drawer-badge">{cartCount > 9 ? "9+" : cartCount}</span>
              )}
            </Link>
          </div>
        </div>

        <div className="nav-mobile-drawer-foot">
          <div className="mb-3 flex items-center justify-center gap-2">
            <ThemeToggle />
            <NotificationDropdown />
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full rounded-xl" asChild onClick={onClose}>
                <Link to="/">Marketplace home</Link>
              </Button>
              <Button variant="default" className="w-full rounded-xl" asChild onClick={onClose}>
                <Link to={workspaceHref}>Workspace</Link>
              </Button>
              <Button variant="outline" className="w-full rounded-xl" asChild onClick={onClose}>
                <Link to={accountHref}>
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isLoading}
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <Button variant="outline" className="w-full rounded-xl" asChild onClick={onClose}>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="default" className="w-full rounded-xl" asChild onClick={onClose}>
                <Link to="/signup">Create account</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}

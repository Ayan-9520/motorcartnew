import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Search, User, Users, ShoppingCart, Heart } from "lucide-react";
import { MotorcartLogo } from "@/components/brand/MotorcartLogo";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { NAV_LINKS } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { getRoleAccountPath } from "@/auth/get-role-account-path";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";
import type { AppRole } from "@/types/database";
import { usePartsCartStore } from "@/store/partsCartStore";
import { useVehicleMarketStore } from "@/store/vehicleMarketStore";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { VehicleHubIconBar } from "@/features/marketplace/components/VehicleHubIconBar";

function isInsuranceNavPath(pathname: string): boolean {
  return pathname === "/insurance" || pathname.startsWith("/insurance/");
}

function navMenuLinkClass(linkHref: string, isActive: boolean, pathname: string) {
  const active =
    linkHref === "/insurance"
      ? isInsuranceNavPath(pathname)
      : isActive;
  return cn("nav-menu-link whitespace-nowrap", active && "nav-menu-link-active");
}

export function Navbar() {
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const hideVehicleHubBar =
    pathname === "/community" ||
    pathname.startsWith("/community/") ||
    pathname.startsWith("/dashboard");
  const [scrolled, setScrolled] = useState(false);
  const { mobileMenuOpen, setMobileMenuOpen, setSearchOpen } = useUIStore();
  const { isAuthenticated } = useAuth();
  const user = useAuthStore((s) => s.user);
  const workspaceHref = user ? getRoleDashboardPath(user) : "/";
  const accountHref = user ? getRoleAccountPath(user) : "/profile";
  const cartCount = usePartsCartStore((s) => s.itemCount());
  const wishlistCount = useVehicleMarketStore((s) => s.wishlist.length);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncNavHeight = () => {
      document.documentElement.style.setProperty("--nav-height", `${el.offsetHeight}px`);
    };

    syncNavHeight();
    const observer = new ResizeObserver(syncNavHeight);
    observer.observe(el);
    window.addEventListener("resize", syncNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncNavHeight);
    };
  }, [mobileMenuOpen, hideVehicleHubBar, pathname]);

  const openSearch = () => setSearchOpen(true);
  const closeMobile = () => setMobileMenuOpen(false);

  const utilities = (
    <div className="nav-utilities-bar">
      <button
        type="button"
        onClick={openSearch}
        className="nav-icon-btn md:hidden"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      <button type="button" onClick={openSearch} className="nav-search" aria-label="Search">
        <Search className="h-4 w-4 shrink-0 text-primary" />
        <span className="nav-search-text">Search…</span>
        <kbd className="nav-kbd">⌘K</kbd>
      </button>

      <Link
        to="/wishlist"
        className={cn(
          "nav-icon-btn nav-icon-btn-ghost relative",
          wishlistCount > 0 && "text-primary"
        )}
        title={wishlistCount > 0 ? `Wishlist — ${wishlistCount} saved` : "Wishlist"}
        aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} saved vehicles` : ""}`}
      >
        <Heart className={cn("h-5 w-5", wishlistCount > 0 && "fill-current")} />
        {wishlistCount > 0 && (
          <span className="nav-badge nav-badge-wishlist" aria-hidden>
            {wishlistCount > 9 ? "9+" : wishlistCount}
          </span>
        )}
      </Link>

      <Link
        to="/cart"
        className="nav-icon-btn nav-icon-btn-ghost relative"
        title={cartCount > 0 ? `Cart — ${cartCount} items` : "Parts cart"}
        aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
      >
        <ShoppingCart className="h-5 w-5" />
        {cartCount > 0 && <span className="nav-badge">{cartCount > 9 ? "9+" : cartCount}</span>}
      </Link>

      <ThemeToggle />

      <NotificationDropdown />

      {isAuthenticated ? (
        <>
          <Button
            variant="default"
            size="sm"
            className="nav-workspace hidden h-8 rounded-lg px-2.5 text-xs xl:inline-flex"
            asChild
          >
            <Link to={workspaceHref}>Workspace</Link>
          </Button>
          <Link
            to="/community"
            className="nav-icon-btn nav-icon-btn-ghost hidden md:inline-flex"
            aria-label="Community"
          >
            <Users className="h-5 w-5" />
          </Link>
          <Link
            to={accountHref}
            className={cn(
              "nav-account-btn hidden items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 md:inline-flex",
              pathname.startsWith(accountHref.split("#")[0]!) && "border-primary/40 bg-primary/10 text-primary"
            )}
            aria-label="Account"
          >
            <User className="h-4 w-4 shrink-0" />
            <span>Account</span>
          </Link>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="nav-login hidden h-8 rounded-lg px-2.5 text-xs font-semibold sm:inline-flex"
          asChild
        >
          <Link to="/login">Sign in</Link>
        </Button>
      )}

      <button
        type="button"
        className="nav-icon-btn md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <>
      <header
        ref={headerRef}
        className={cn("nav-shell nav-shell-stacked nav-shell-fixed", scrolled && "nav-shell-scrolled")}
      >
        {/* Row 1: logo + small vehicle icons + search & utilities */}
        <div className="nav-top-bar">
          <div className="container nav-top-bar-inner">
            <Link to="/" className="nav-brand shrink-0" aria-label="Motorcart home">
              <MotorcartLogo variant="icon" height={36} className="sm:hidden" />
              <MotorcartLogo variant="full" height={32} className="hidden sm:inline-block" />
            </Link>

            {!hideVehicleHubBar && (
              <div className="nav-top-hub hidden min-w-0 flex-1 justify-center md:flex">
                <VehicleHubIconBar variant="inline" />
              </div>
            )}

            {utilities}
          </div>
        </div>

        {/* Row 2: desktop pages menu only (mobile uses drawer — avoids double header) */}
        <div className="nav-menu-bar hidden md:block">
          <div className="container nav-menu-bar-inner">
            <nav className="nav-menu-track flex" aria-label="Main">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) => navMenuLinkClass(link.href, isActive, pathname)}
                  end={link.href === "/buy" || link.href === "/auctions" ? false : undefined}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="nav-mobile md:hidden">
            {!hideVehicleHubBar && (
              <div className="border-b border-border/60 px-3 py-2">
                <VehicleHubIconBar variant="inline" onNavigate={closeMobile} />
              </div>
            )}
            <button
              type="button"
              className="nav-mobile-search"
              onClick={() => {
                openSearch();
                closeMobile();
              }}
            >
              <Search className="h-4 w-4 text-primary" />
              Search Motorcart
              <kbd className="nav-kbd ml-auto">⌘K</kbd>
            </button>
            <nav className="flex flex-col gap-0.5 px-2 pb-2">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  onClick={closeMobile}
                  end={link.href === "/buy" || link.href === "/auctions" ? false : undefined}
                  className={({ isActive }) => {
                    const active =
                      link.href === "/insurance"
                        ? isInsuranceNavPath(pathname)
                        : isActive;
                    return cn("nav-mobile-link", active && "nav-mobile-link-active");
                  }}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="mx-4 flex gap-2 border-t border-border/80 py-4">
              <Link
                to="/wishlist"
                className="nav-mobile-wishlist relative flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 py-2.5 text-sm font-medium"
                onClick={closeMobile}
              >
                <Heart className={cn("h-4 w-4", wishlistCount > 0 && "fill-primary text-primary")} />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/70 py-2.5 text-sm font-medium"
                onClick={closeMobile}
              >
                <ShoppingCart className="h-4 w-4" />
                Cart
              </Link>
            </div>
            <div className="border-t border-border/80 px-4 py-4">
              <div className="mb-3 flex items-center justify-center gap-2">
                <ThemeToggle />
                <NotificationDropdown />
              </div>
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="w-full rounded-xl" asChild onClick={closeMobile}>
                    <Link to="/">Marketplace home</Link>
                  </Button>
                  <Button variant="default" className="w-full rounded-xl" asChild onClick={closeMobile}>
                    <Link to={workspaceHref}>Workspace</Link>
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl" asChild onClick={closeMobile}>
                    <Link to={accountHref}>
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2">
                  <Button variant="outline" className="w-full rounded-xl" asChild onClick={closeMobile}>
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button variant="default" className="w-full rounded-xl" asChild onClick={closeMobile}>
                    <Link to="/signup">Create account</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <div className="nav-shell-spacer" aria-hidden />
    </>
  );
}

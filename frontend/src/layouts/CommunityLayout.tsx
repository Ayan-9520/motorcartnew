import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Compass,
  Home,
  LogOut,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { SocialAvatar } from "@/features/community/components/SocialAvatar";
import { communityLoginPath, communitySignupPath } from "@/features/community/lib/community-routes";
import { Button } from "@/components/ui/button";

function isFeedPath(pathname: string) {
  return pathname === "/community";
}

export function CommunityLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

  const profileHref = user ? `/community/u/${user.id}` : communityLoginPath("/community/me");

  const nav = [
    { href: "/community", label: "Feed", icon: Home, active: isFeedPath(pathname) },
    {
      href: "/community/discover",
      label: "Discover",
      icon: Compass,
      active: pathname.startsWith("/community/discover"),
    },
    {
      href: "/community/saved",
      label: "Saved",
      icon: Bookmark,
      active: pathname.startsWith("/community/saved"),
      authOnly: true,
    },
    {
      href: "/community/groups",
      label: "Groups",
      icon: Users,
      active: pathname.startsWith("/community/groups"),
    },
    {
      href: profileHref,
      label: "Profile",
      icon: UserCircle,
      active: pathname.startsWith("/community/u/") || pathname === "/community/me",
      authOnly: true,
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/community", { replace: true });
  };

  const mobileItems = [
    ...nav.filter((item) => !item.authOnly || isAuthenticated),
    isAuthenticated
      ? ({ type: "signout" as const, label: "Sign out", icon: LogOut })
      : ({ type: "link" as const, href: communityLoginPath("/community"), label: "Sign in", icon: UserCircle }),
  ];

  return (
    <div className="community-app-shell">
      <aside className="community-app-rail hidden lg:flex" aria-label="Community">
        <div className="community-app-rail-head shrink-0">
          <Link to="/" className="community-app-back">
            <ArrowLeft className="h-4 w-4" />
            Motorcart
          </Link>

          <p className="community-app-rail-title">Community</p>
        </div>

        <nav className="community-app-nav" aria-label="Community sections">
          {nav.map((item) => {
            if (item.authOnly && !isAuthenticated) return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn("community-app-nav-item", item.active && "community-app-nav-item-active")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="community-app-rail-foot">
          {isAuthenticated && user ? (
            <>
              <Link to={profileHref} className="community-app-user-card">
                <SocialAvatar userId={user.id} name={user.fullName} src={user.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">Community profile</p>
                </div>
              </Link>
              <Button
                type="button"
                variant="destructive"
                className="community-app-signout w-full rounded-xl font-semibold"
                disabled={isLoading}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full rounded-xl font-semibold" asChild>
                <Link to={communityLoginPath("/community")}>Sign in to post</Link>
              </Button>
              <p className="px-1 text-[11px] text-muted-foreground">
                New here?{" "}
                <Link to={communitySignupPath("/community")} className="font-medium text-primary hover:underline">
                  Create account
                </Link>
              </p>
            </>
          )}
        </div>
      </aside>

      <div className="community-app-main min-w-0 flex-1">
        <Outlet />
      </div>

      <nav className="community-app-mobile-bar lg:hidden" aria-label="Community">
        {mobileItems.map((item) => {
          if ("type" in item && item.type === "signout") {
            const Icon = item.icon;
            return (
              <button
                key="signout"
                type="button"
                className="community-app-mobile-item community-app-mobile-item--danger"
                onClick={() => void handleSignOut()}
              >
                <span className="community-app-mobile-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="community-app-mobile-label">{item.label}</span>
              </button>
            );
          }

          const Icon = item.icon;
          const href = "href" in item ? item.href : "/community";
          const active = "active" in item ? item.active : false;

          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "community-app-mobile-item",
                active && "community-app-mobile-item-active"
              )}
            >
              <span className="community-app-mobile-icon">
                <Icon className="h-5 w-5" />
              </span>
              <span className="community-app-mobile-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

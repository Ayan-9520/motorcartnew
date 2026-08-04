import { Navigate, useLocation } from "react-router-dom";

/** Legacy URL redirects — preserve bookmarks without breaking router. */
export function LegacyRedirects() {
  const { pathname } = useLocation();

  if (pathname === "/marketplace" || pathname === "/marketplace/") {
    return <Navigate to="/buy" replace />;
  }

  if (pathname.startsWith("/marketplace/buy")) {
    return <Navigate to={pathname.replace("/marketplace/buy", "/buy")} replace />;
  }

  return null;
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll window to top on route change (SPA). */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? ("instant" as ScrollBehavior) : "auto" });
  }, [pathname]);

  return null;
}

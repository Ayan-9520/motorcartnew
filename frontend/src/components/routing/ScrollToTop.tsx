import { useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

/**
 * On every new page (link click / navigate) jump to the top — or to `#hash` when present.
 * Browser back/forward (POP) keeps the browser's own scroll restoration.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>("main, .workspace-shell__main").forEach((el) => {
      if (el.scrollTop > 0) el.scrollTop = 0;
    });
  }, [pathname, hash, navigationType]);

  return null;
}

/** Root route element: mounts scroll handling for every page. */
export function ScrollToTopRoot() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

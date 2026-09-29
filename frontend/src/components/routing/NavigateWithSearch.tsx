import { Navigate, useLocation } from "react-router-dom";

/** Redirect that keeps `?brand=…&fuel=…` so legacy hub links land filtered. */
export function NavigateWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

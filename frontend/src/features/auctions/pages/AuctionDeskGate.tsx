import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { AuctionAdminPage } from "./AuctionAdminPage";

/** Routes legacy `/dashboard/auction` — admins stay in Super Admin ERP shell. */
export function AuctionDeskGate() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === "admin" || role === "super_admin") {
    return <Navigate to="/dashboard/super-admin/auction-desk" replace />;
  }
  return <AuctionAdminPage />;
}

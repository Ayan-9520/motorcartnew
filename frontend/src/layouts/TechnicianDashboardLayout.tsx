import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { TechnicianSidebar } from "@/components/layout/TechnicianSidebar";

export function TechnicianDashboardLayout() {
  return (
    <div className="workspace-shell flex flex-col">
      <Navbar />
      <div className="workspace-shell__body">
        <TechnicianSidebar />
        <main className="workspace-shell__main bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

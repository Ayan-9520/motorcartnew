import { Link, Outlet } from "react-router-dom";

/** Minimal broker shell — no deals, commissions, or WhatsApp nav (E4+). */
export function BrokerDashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">Broker CRM</span>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/dashboard/broker" className="hover:text-foreground">
            Overview
          </Link>
        </nav>
      </header>
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

import { Link, Outlet } from "react-router-dom";
import { featureFlags } from "@/config/feature-flags";

/** Minimal broker shell — no deals, commissions, or WhatsApp nav (E4+). */
export function BrokerDashboardLayout() {
  if (!featureFlags.brokerCrm) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Broker workspace</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Broker CRM is not enabled in this environment. Contact your administrator.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

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

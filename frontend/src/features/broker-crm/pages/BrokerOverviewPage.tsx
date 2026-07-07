import { featureFlags } from "@/config/feature-flags";

export function BrokerOverviewPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Broker overview</h1>
      <p className="text-muted-foreground text-sm">
        Vehicle broker workspace. Buyers, sellers, and leads APIs are available when the
        corresponding feature flags are enabled in your environment.
      </p>
      <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
        <li>
          Contacts (buyers / sellers):{" "}
          {featureFlags.brokerContacts ? "enabled" : "disabled"}
        </li>
        <li>Leads: {featureFlags.brokerLeads ? "enabled" : "disabled"}</li>
        <li>
          Marketplace bridge:{" "}
          {featureFlags.brokerMarketplaceBridge ? "enabled" : "disabled (default)"}
        </li>
        <li>Deal pipeline: not available (E4+)</li>
        <li>Commissions: not available (E7+)</li>
        <li>WhatsApp desk: not available (E8+)</li>
      </ul>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AIControlCenterPage } from "@/ai/pages/AIControlCenterPage";
import { fetchCommunicationProviders, saveCommunicationProvider } from "@/features/dealer-crm/services/commos.service";

/** AI controls embedded in super admin shell — reuses global control center. */
export function SuperAdminAIPage() {
  const [providers, setProviders] = useState<Array<{ name: string; channel: string; configured: boolean; status: string }>>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void fetchCommunicationProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  return (
    <div className="sa-ai-embed space-y-6">
      <section className="rounded-xl border border-border p-4">
        <h2 className="font-semibold">Communication providers</h2>
        <p className="text-xs text-muted-foreground mt-1">Secrets are never returned after save. WhatsApp ≠ telephony.</p>
        <ul className="mt-3 text-sm space-y-1">
          {providers.map((p) => (
            <li key={`${p.channel}-${p.name}`}>
              {p.channel} · {p.name} · {p.configured ? "configured" : "not configured"} · {p.status}
            </li>
          ))}
          {!providers.length ? <li>No providers yet</li> : null}
        </ul>
        <form
          className="mt-3 flex flex-wrap gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void saveCommunicationProvider({
              name: String(fd.get("name") ?? ""),
              channel: String(fd.get("channel") ?? ""),
              kind: "ADMIN",
              secret: String(fd.get("secret") ?? "") || undefined,
              webhookSecret: String(fd.get("webhookSecret") ?? "") || undefined,
            })
              .then(() => {
                setStatus("Saved (secret hidden)");
                e.currentTarget.reset();
                return fetchCommunicationProviders().then(setProviders);
              })
              .catch(() => setStatus("Save failed"));
          }}
        >
          <input name="name" placeholder="Name" className="rounded border px-2 py-1" required />
          <select name="channel" className="rounded border px-2 py-1" defaultValue="WHATSAPP">
            <option>WHATSAPP</option>
            <option>SMS</option>
            <option>EMAIL</option>
            <option>TELEPHONY</option>
          </select>
          <input name="secret" type="password" placeholder="Secret" className="rounded border px-2 py-1" />
          <input name="webhookSecret" type="password" placeholder="Webhook secret" className="rounded border px-2 py-1" />
          <button type="submit" className="rounded border px-3 py-1">Save</button>
        </form>
        {status ? <p className="text-xs mt-2">{status}</p> : null}
      </section>
      <AIControlCenterPage />
    </div>
  );
}


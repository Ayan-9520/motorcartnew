import { useEffect, useMemo, useState } from "react";
import { MessageCircle, ExternalLink, CheckCircle2, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { StatCard } from "../components/StatCard";
import { useDealerCRM } from "../hooks/useDealerCRM";
import { fetchCommunicationProviders } from "../services/commos.service";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

const QUICK_REPLIES = [
  "Thanks for your interest in our {vehicle}! I'll share full details & best price shortly.",
  "Test drive slots available tomorrow 10 AM – 6 PM at our {city} showroom.",
  "This {brand} listing is negotiable — call or reply here for fleet discount.",
];

export function DealerWhatsAppPage() {
  const { dealer, stats, leads } = useDealerCRM();
  const [waConfigured, setWaConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setPageMeta({ title: "WhatsApp desk" });
    void fetchCommunicationProviders()
      .then((rows) => setWaConfigured(rows.some((r) => r.channel === "WHATSAPP" && r.configured && r.status === "ACTIVE")))
      .catch(() => setWaConfigured(false));
  }, []);

  const waNumber = dealer?.phone?.replace(/\D/g, "") ?? "919876543210";
  const waLeads = useMemo(() => leads.filter((l) => l.status !== "lost").slice(0, 12), [leads]);

  const copyReply = (msg: string) => {
    const filled = msg
      .replace("{city}", dealer?.city ?? "showroom")
      .replace("{brand}", "Hyundai")
      .replace("{vehicle}", "vehicle");
    void navigator.clipboard.writeText(filled);
    toast.success("Copied to clipboard");
  };

  return (
    <DealerConsoleShell
      title="WhatsApp integration"
      description="Business API desk — quick replies, lead chat links and click tracking."
      crumbs={[{ label: "WhatsApp" }]}
      actions={
        <Button
          className="gap-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white"
          onClick={() => window.open(`https://wa.me/${waNumber}`, "_blank")}
        >
          Open WhatsApp <ExternalLink className="h-4 w-4" />
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="WA clicks (MTD)" value={stats.whatsappChats} icon={MessageCircle} />
        <StatCard label="Active leads" value={waLeads.length} icon={MessageCircle} change="Chat ready" />
        <StatCard label="New leads" value={stats.newLeads} icon={MessageCircle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dealer-os-card border-[#25D366]/30">
          <h2 className="font-semibold">Connection status</h2>
          <div className="mt-3 flex items-center gap-2">
            {waConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-[#25D366]" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="font-medium">{waConfigured ? "Connected" : "Provider not configured"}</span>
            <Badge className={waConfigured ? "bg-[#25D366]/15 text-[#128C7E] border-0" : "border-0"} variant="outline">
              {waConfigured ? "Active" : "Disabled"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Business number: +{waNumber}</p>
          <p className="text-xs text-muted-foreground mt-4">
            WhatsApp delivery uses the shared Communication OS. Messages stay SENT until the provider webhook confirms
            DELIVERED. This is not the telephony dialer.
          </p>
        </div>

        <div className="dealer-os-card">
          <h2 className="font-semibold mb-3">Quick replies</h2>
          <div className="space-y-2">
            {QUICK_REPLIES.map((msg, i) => (
              <button
                key={i}
                type="button"
                className="dealer-wa-reply w-full text-left"
                onClick={() => copyReply(msg)}
              >
                <Copy className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="text-sm">{msg}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dealer-os-card">
        <h2 className="font-semibold mb-3">Lead conversations</h2>
        <table className="dealer-os-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Phone</th>
              <th>Interest</th>
              <th>Stage</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {waLeads.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">{l.name}</td>
                <td>{l.phone}</td>
                <td className="max-w-[140px] truncate text-muted-foreground">{l.vehicleInterest ?? "—"}</td>
                <td className="capitalize">{l.status}</td>
                <td>
                  <Button size="sm" variant="outline" className="text-[#128C7E] border-[#25D366]/40" asChild>
                    <a href={`https://wa.me/91${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      Chat
                    </a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DealerConsoleShell>
  );
}

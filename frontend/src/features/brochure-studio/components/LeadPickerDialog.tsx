import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchStudioLeads, type StudioLead } from "../services/brochure.service";

type Props = {
  open: boolean;
  mode: "send" | "save";
  dealerId: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (lead: StudioLead | null, manualPhone?: string) => void;
};

export function LeadPickerDialog({ open, mode, dealerId, busy, onOpenChange, onPick }: Props) {
  const [leads, setLeads] = useState<StudioLead[] | null>(null);
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!open || !dealerId) return;
    setLeads(null);
    void fetchStudioLeads(dealerId).then(setLeads).catch(() => setLeads([]));
  }, [open, dealerId]);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (leads ?? []).filter((l) => !n || `${l.name} ${l.phone} ${l.vehicleInterest}`.toLowerCase().includes(n)).slice(0, 50);
  }, [leads, q]);

  const manualOk = /^\+?\d[\d\s-]{8,14}$/.test(phone.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "send" ? "Send poster to customer" : "Add poster to lead folder"}</DialogTitle>
          <DialogDescription>
            {mode === "send"
              ? "Pick a lead — WhatsApp opens with the poster link and listing link. The poster is also saved in the lead's notes."
              : "The poster is saved in the lead's notes so your whole team can see what was shared."}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone or car" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {leads === null ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{leads.length ? "No lead matches" : "No leads yet"}</p>
          ) : (
            rows.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={busy}
                onClick={() => onPick(l)}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-60"
              >
                <UserRound className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.phone}
                    {l.vehicleInterest ? ` · ${l.vehicleInterest}` : ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        {mode === "send" ? (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs text-muted-foreground">Not a lead yet? Send to any WhatsApp number:</p>
            <div className="flex gap-2">
              <Input placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
              <Button disabled={!manualOk || busy} onClick={() => onPick(null, phone.trim())}>
                Send
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

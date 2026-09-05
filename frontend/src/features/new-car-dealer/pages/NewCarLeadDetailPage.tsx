import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, MessageSquare, Phone, Shield, Landmark } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { fetchLeadDetail, updateNcdLeadStage } from "../services/new-car-dealer.service";
import type { NcdLeadDetail, NcdLeadStage } from "../types";
import { NCD_LEAD_STAGES } from "../data/mock-ncd-data";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";

const STAGE_LABELS: Record<NcdLeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  test_drive: "Test drive",
  negotiation: "Negotiation",
  finance: "Finance",
  booking: "Booking",
  delivered: "Delivered",
  lost: "Lost",
};

export function NewCarLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<NcdLeadDetail | null>(null);

  const reload = () => {
    if (!id) return;
    void fetchLeadDetail(id).then(setLead);
  };

  useEffect(() => {
    reload();
    setPageMeta({ title: "Lead detail" });
  }, [id]);

  const onStageChange = async (stage: NcdLeadStage) => {
    if (!id) return;
    const { error } = await updateNcdLeadStage(id, stage);
    if (error) {
      toast.error(error.message ?? "Update failed");
      return;
    }
    toast.success(`Stage: ${STAGE_LABELS[stage]}`);
    reload();
  };

  if (!lead) {
    return (
      <NewCarDealerShell title="Lead" crumbs={[{ label: "CRM", href: "/dashboard/new-car/leads" }]}>
        <p className="text-muted-foreground">Loading…</p>
      </NewCarDealerShell>
    );
  }

  return (
    <NewCarDealerShell
      title={lead.customerName}
      description={`${lead.city || "—"} · ${lead.source} · Score ${lead.score}`}
      crumbs={[
        { label: "CRM", href: "/dashboard/new-car/leads" },
        { label: lead.customerName },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" asChild>
            <a href={`tel:${lead.phone}`}>
              <Phone className="mr-1 h-4 w-4" /> Call
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to={`/dashboard/new-car/quotations/new?phone=${encodeURIComponent(lead.phone)}`}>
              <FileText className="mr-1 h-4 w-4" /> Quotation
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="ncd-panel lg:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{lead.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preferred car</p>
              <p className="font-medium">
                {lead.preferredBrand} {lead.preferredModel}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="font-medium">{lead.budgetMax ? formatCurrency(lead.budgetMax) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trade-in</p>
              <p className="font-medium">{lead.tradeIn ?? "None"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pipeline stage</p>
              <select
                className="mt-1 flex h-10 w-full max-w-xs rounded-xl border border-input bg-background px-3 text-sm"
                value={lead.stage}
                onChange={(e) => void onStageChange(e.target.value as NcdLeadStage)}
              >
                {NCD_LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              {lead.financeInterest ? (
                <Badge variant="secondary">
                  <Landmark className="mr-1 h-3 w-3" /> Finance
                </Badge>
              ) : null}
              {lead.insuranceInterest ? (
                <Badge variant="secondary">
                  <Shield className="mr-1 h-3 w-3" /> Insurance
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="ncd-panel">
            <h3 className="font-semibold">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" className="rounded-lg justify-start" asChild>
                <a href={`tel:${lead.phone}`}>
                  <Phone className="mr-2 h-4 w-4" /> Call customer
                </a>
              </Button>
              <Button variant="outline" className="rounded-lg justify-start" asChild>
                <Link to="/dashboard/new-car/test-drives">Test drive requests</Link>
              </Button>
              <Button variant="outline" className="rounded-lg justify-start" asChild>
                <Link to="/finance/apply">Start finance</Link>
              </Button>
              <Button variant="outline" className="rounded-lg justify-start" asChild>
                <Link to="/dashboard/dealer/whatsapp">
                  <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp desk
                </Link>
              </Button>
            </div>
          </div>
          <div className="ncd-panel">
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{new Date(lead.createdAt).toLocaleString("en-IN")}</p>
          </div>
        </aside>
      </div>
    </NewCarDealerShell>
  );
}

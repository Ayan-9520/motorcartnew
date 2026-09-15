import { useEffect, useMemo, useState } from "react";
import { Flame, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { NcdLeadPipeline } from "../components/NcdLeadPipeline";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { setPageMeta } from "@/utils/seo";
import { DealerAddLeadDialog } from "@/features/dealer-crm/components/DealerAddLeadDialog";

export function NewCarLeadsPage() {
  const { data, refresh, dealer } = useNewCarDealerOS();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "Lead CRM" });
  }, []);

  const leads = data?.leads ?? [];
  const stats = useMemo(() => {
    const hot = data?.hotLeadsCount ?? 0;
    const testDrive = leads.filter((l) => l.stage === "test_drive").length;
    const booking = leads.filter((l) => l.stage === "booking").length;
    return { total: leads.length, hot, testDrive, booking };
  }, [leads, data?.hotLeadsCount]);

  return (
    <NewCarDealerShell
      className="ncd-page--premium"
      title="Automotive CRM"
      description="Website, WhatsApp, walk-in, Meta, Google, CarDekho & referrals — full pipeline."
      actions={
        <Button className="rounded-xl shadow-[var(--shadow-primary)]" disabled={!dealer?.id} onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add lead
        </Button>
      }
    >
      <div className="ncd-crm-stats">
        <div className="ncd-crm-stat">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="ncd-crm-stat__value">{stats.total}</p>
            <p className="ncd-crm-stat__label">Total leads</p>
          </div>
        </div>
        <div className="ncd-crm-stat ncd-crm-stat--hot">
          <Flame className="h-4 w-4 text-amber-500" />
          <div>
            <p className="ncd-crm-stat__value">{stats.hot}</p>
            <p className="ncd-crm-stat__label">Hot · follow up</p>
          </div>
        </div>
        <div className="ncd-crm-stat">
          <div>
            <p className="ncd-crm-stat__value">{stats.testDrive}</p>
            <p className="ncd-crm-stat__label">Test drives</p>
          </div>
        </div>
        <div className="ncd-crm-stat">
          <div>
            <p className="ncd-crm-stat__value">{stats.booking}</p>
            <p className="ncd-crm-stat__label">Bookings</p>
          </div>
        </div>
      </div>

      <section className="ncd-panel ncd-panel--premium ncd-crm-board">
        <div className="ncd-panel__head">
          <div>
            <p className="ncd-section-eyebrow mb-1">Pipeline</p>
            <h2 className="ncd-section-title mb-0">Lead stages</h2>
          </div>
          <span className="ncd-panel__badge">Drag stages via dropdown</span>
        </div>
        <NcdLeadPipeline leads={leads} onStageChange={() => void refresh()} />
      </section>

      {dealer?.id ? (
        <DealerAddLeadDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dealerId={dealer.id}
          variant="new_car"
          onSaved={() => void refresh()}
        />
      ) : null}
    </NewCarDealerShell>
  );
}

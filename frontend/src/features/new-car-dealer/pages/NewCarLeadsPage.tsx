import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

  return (
    <NewCarDealerShell
      title="Automotive CRM"
      description="Website, WhatsApp, walk-in, Meta, Google, CarDekho & referrals — full pipeline."
      actions={
        <Button className="rounded-xl" disabled={!dealer?.id} onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add lead
        </Button>
      }
    >
      <NcdLeadPipeline leads={data?.leads ?? []} onStageChange={() => void refresh()} />
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

import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import type { NcdLead, NcdLeadStage } from "../types";
import { NCD_LEAD_STAGES } from "../data/mock-ncd-data";
import { cn } from "@/lib/utils";
import { updateNcdLeadStage } from "../services/new-car-dealer.service";

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

type NcdLeadPipelineProps = {
  leads: NcdLead[];
  compact?: boolean;
  onStageChange?: () => void;
};

export function NcdLeadPipeline({ leads, compact, onStageChange }: NcdLeadPipelineProps) {
  const cols = compact
    ? (["new", "test_drive", "negotiation", "booking"] as NcdLeadStage[])
    : NCD_LEAD_STAGES.filter((s) => s !== "lost");

  const moveStage = async (leadId: string, stage: NcdLeadStage) => {
    const { error } = await updateNcdLeadStage(leadId, stage);
    if (error) {
      toast.error(error.message ?? "Could not update stage");
      return;
    }
    toast.success(`Moved to ${STAGE_LABELS[stage]}`);
    onStageChange?.();
  };

  return (
    <div className={cn("ncd-pipeline", compact && "ncd-pipeline--compact")}>
      {cols.map((stage) => {
        const items = leads.filter((l) => l.stage === stage);
        return (
          <div key={stage} className="ncd-pipeline__col">
            <p className="ncd-pipeline__head">
              {STAGE_LABELS[stage]}
              <span className="ml-1 rounded-full bg-slate-700 px-1.5 text-[10px]">{items.length}</span>
            </p>
            <div className="ncd-pipeline__cards">
              {items.slice(0, compact ? 2 : 8).map((l) => (
                <div key={l.id} className="ncd-pipeline__card space-y-2">
                  <Link to={`/dashboard/new-car/leads/${l.id}`} className="block hover:opacity-90">
                    <p className="font-medium text-sm">{l.customerName}</p>
                    <p className="text-[10px] text-slate-400">{l.preferredModel ?? "—"} · {l.source}</p>
                    <p className="text-[10px] text-emerald-400">Score {l.score}</p>
                  </Link>
                  {!compact ? (
                    <select
                      className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-[10px]"
                      value={l.stage}
                      onChange={(e) => void moveStage(l.id, e.target.value as NcdLeadStage)}
                      aria-label={`Move ${l.customerName}`}
                    >
                      {NCD_LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

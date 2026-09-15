import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronDown, Flame, Inbox } from "lucide-react";
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

const STAGE_TONE: Record<NcdLeadStage, string> = {
  new: "new",
  contacted: "contacted",
  interested: "interested",
  test_drive: "test-drive",
  negotiation: "negotiation",
  finance: "finance",
  booking: "booking",
  delivered: "delivered",
  lost: "lost",
};

type NcdLeadPipelineProps = {
  leads: NcdLead[];
  compact?: boolean;
  onStageChange?: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function scoreTone(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

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
    <div className={cn("ncd-pipeline", compact ? "ncd-pipeline--compact" : "ncd-pipeline--full")}>
      {cols.map((stage) => {
        const items = leads.filter((l) => l.stage === stage);
        const tone = STAGE_TONE[stage];
        return (
          <div key={stage} className={cn("ncd-pipeline__col", `ncd-pipeline__col--${tone}`)}>
            <div className="ncd-pipeline__head">
              <span className="ncd-pipeline__stage-dot" aria-hidden />
              <span className="ncd-pipeline__stage-label">{STAGE_LABELS[stage]}</span>
              <span className="ncd-pipeline__count">{items.length}</span>
            </div>
            <div className="ncd-pipeline__cards">
              {items.length === 0 ? (
                <div className="ncd-pipeline__empty">
                  <Inbox className="h-4 w-4 opacity-40" />
                  <span>No leads</span>
                </div>
              ) : (
                items.slice(0, compact ? 2 : 12).map((l) => {
                  const toneScore = scoreTone(l.score);
                  return (
                    <article key={l.id} className="ncd-pipeline__card">
                      <Link to={`/dashboard/new-car/leads/${l.id}`} className="ncd-pipeline__card-link">
                        <div className="ncd-pipeline__card-top">
                          <span className="ncd-pipeline__avatar" aria-hidden>
                            {initials(l.customerName) || "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="ncd-pipeline__name">{l.customerName}</p>
                            <p className="ncd-pipeline__meta">
                              {l.preferredModel ?? l.preferredBrand ?? "—"} · {l.source}
                            </p>
                          </div>
                          <span className={cn("ncd-pipeline__score", `ncd-pipeline__score--${toneScore}`)}>
                            {toneScore === "hot" ? <Flame className="h-3 w-3" /> : null}
                            {l.score}
                          </span>
                        </div>
                        {l.city ? <p className="ncd-pipeline__city">{l.city}</p> : null}
                      </Link>
                      {!compact ? (
                        <div className="ncd-pipeline__move">
                          <select
                            className="ncd-pipeline__select"
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
                          <ChevronDown className="ncd-pipeline__select-icon h-3.5 w-3.5" aria-hidden />
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

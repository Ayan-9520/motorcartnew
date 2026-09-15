import { Link } from "react-router-dom";
import { Bot, ChevronRight, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { greetingForDealer } from "../data/mock-ncd-data";
import type { NcdAiInsight, NcdShowroom } from "../types";

type NewCarDealerHeroProps = {
  userName: string;
  showroom: NcdShowroom;
  hotLeadsCount: number;
  topInsight?: NcdAiInsight;
};

export function NewCarDealerHero({ userName, showroom, hotLeadsCount, topInsight }: NewCarDealerHeroProps) {
  const target = Number(showroom.monthlyTarget) || 0;
  const achieved = Number(showroom.monthlyAchieved) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const targetLabel = target > 0 ? `${pct}% achieved` : "Set a monthly target";

  return (
    <section className="ncd-hero ncd-hero--premium">
      <div className="ncd-hero__glow" aria-hidden />
      <div className="ncd-hero__mesh" aria-hidden />
      <div className="ncd-hero__grid">
        <div className="min-w-0">
          <div className="ncd-hero__eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {showroom.brand || "Showroom"} · {showroom.city || "India"}
            </span>
            <span className="ncd-hero__live-pill">{showroom.status || "live"}</span>
          </div>
          <h1 className="ncd-hero__title">{greetingForDealer(userName)}</h1>
          <p className="ncd-hero__alert">
            <span className="ncd-hero__alert-dot" />
            <span>
              <strong>{hotLeadsCount} hot leads</strong> waiting for follow-up today.
            </span>
          </p>
          {topInsight ? (
            <p className="ncd-hero__ai">
              <Bot className="h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-medium text-foreground">{topInsight.title}</span>
                <span className="text-muted-foreground"> — {topInsight.summary}</span>
              </span>
            </p>
          ) : null}
          <div className="ncd-hero__actions">
            <Button className="rounded-xl shadow-[var(--shadow-primary)]" asChild>
              <Link to="/dashboard/new-car/leads">
                Lead CRM <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl bg-background/70 backdrop-blur" asChild>
              <Link to="/dashboard/new-car/ai">AI assistant</Link>
            </Button>
            <Button variant="ghost" className="rounded-xl text-muted-foreground" asChild>
              <Link to="/dashboard/new-car/inventory">New car stock</Link>
            </Button>
          </div>
        </div>

        <aside className="ncd-hero__target-card">
          <div className="ncd-hero__target-head">
            <Target className="h-4 w-4 text-primary" />
            Monthly target
          </div>
          <p className="ncd-hero__target-value">
            <span className="tabular-nums">{achieved}</span>
            <span className="ncd-hero__target-den"> / {target} units</span>
          </p>
          <div className="ncd-hero__target-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="ncd-hero__target-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="ncd-hero__target-meta">
            {targetLabel}
            <span aria-hidden> · </span>
            {showroom.status || "live"} showroom
          </p>
          <p className="ncd-hero__target-name">{showroom.name}</p>
        </aside>
      </div>
    </section>
  );
}

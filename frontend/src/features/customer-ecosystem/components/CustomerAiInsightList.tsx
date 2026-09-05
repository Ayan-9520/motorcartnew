import { Link } from "react-router-dom";
import { Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiInsight } from "../types";

const severityClass: Record<AiInsight["severity"], string> = {
  info: "cos-insight--info",
  warning: "cos-insight--warning",
  success: "cos-insight--success",
  critical: "cos-insight--critical",
};

type CustomerAiInsightListProps = {
  insights: AiInsight[];
  compact?: boolean;
};

export function CustomerAiInsightList({ insights, compact }: CustomerAiInsightListProps) {
  const list = compact ? insights.slice(0, 3) : insights;
  if (!list.length) {
    if (compact) return null;
    return (
      <p className="cos-empty">
        Personalized AI insights are not available yet. Ownership alerts appear here from your garage, quotations, test drives, and applications.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="cos-section-title">
          <Bot className="h-4 w-4 text-primary" />
          Ownership alerts
        </h2>
        {compact ? (
          <Link to="/dashboard/customer/insights" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      <div className={cn("grid gap-3", compact ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {list.map((ins) => (
          <article key={ins.id} className={cn("cos-insight", severityClass[ins.severity])}>
            <div className="cos-insight__badge">AI</div>
            <h3 className="cos-insight__title">{ins.title}</h3>
            <p className="cos-insight__summary">{ins.summary}</p>
            {ins.vehicleLabel ? <p className="cos-insight__vehicle">{ins.vehicleLabel}</p> : null}
            {ins.actionUrl && ins.actionLabel ? (
              <Link to={ins.actionUrl} className="cos-insight__action">
                {ins.actionLabel} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

import { Bot, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AIHubHeroProps {
  openAIEnabled: boolean;
  agentCount: number;
  workflowCount: number;
  actionsToday: number;
  onRefresh: () => void;
}

export function AIHubHero({
  openAIEnabled,
  agentCount,
  workflowCount,
  actionsToday,
  onRefresh,
}: AIHubHeroProps) {
  return (
    <section className="ai-hub-hero">
      <div className="container">
        <div className="ai-hub-hero-grid">
          <div>
            <span className="ai-hub-badge">
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
              Motorcart AI · Autonomous mesh
            </span>
            <h1 className="ai-hub-title">
              AI Control <span className="text-primary">Center</span>
            </h1>
            <p className="ai-hub-subtitle">
              Twelve domain agents orchestrate leads, finance, auctions, inventory, and community — with
              event-driven workflows, live telemetry, and hybrid GPT + rules intelligence.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge
                variant={openAIEnabled ? "default" : "outline"}
                className={cn(
                  "gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  openAIEnabled && "shadow-[var(--shadow-primary)]"
                )}
              >
                {openAIEnabled ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                OpenAI {openAIEnabled ? "connected" : "rules mode"}
              </Badge>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={onRefresh}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="ai-hub-status-card">
            <div className="flex items-center gap-3">
              <span className="ai-hub-status-icon">
                <Bot className="h-6 w-6 text-primary" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">System health</p>
                <p className="text-xs text-muted-foreground">Auto-refresh every 15s</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              <li className="ai-hub-status-row">
                <span className="text-muted-foreground">Active agents</span>
                <strong>{agentCount}</strong>
              </li>
              <li className="ai-hub-status-row">
                <span className="text-muted-foreground">Workflows</span>
                <strong>{workflowCount}</strong>
              </li>
              <li className="ai-hub-status-row">
                <span className="text-muted-foreground">Actions today</span>
                <strong className="text-primary">{actionsToday}</strong>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">
              <Cpu className="h-4 w-4 shrink-0 text-primary" />
              <span>
                Set <code className="rounded bg-background px-1 font-mono text-[10px]">OPENAI_API_KEY</code> on the backend for GPT responses
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

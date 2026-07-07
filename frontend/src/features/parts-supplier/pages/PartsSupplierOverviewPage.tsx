import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PsMetricGrid } from "../components/PsMetricGrid";
import { PsOrderPipelineBoard } from "../components/PsOrderPipeline";
import { PsSupplierHero } from "../components/PsSupplierHero";
import { PsAlertsPanel } from "../components/PsAlertsPanel";
import { PsMotionSection } from "../components/PsMotionSection";
import { usePartsSupplierOS } from "../hooks/usePartsSupplierOS";
import { setPageMeta } from "@/utils/seo";

export function PartsSupplierOverviewPage() {
  const { data, loading, userName } = usePartsSupplierOS();

  useEffect(() => {
    setPageMeta({ title: "Parts supplier dashboard" });
  }, []);

  if (!data && loading) {
    return <div className="psp-page psp-loading">Loading supplier desk…</div>;
  }

  if (!data) {
    return (
      <div className="psp-page space-y-4 p-6">
        <h1 className="text-xl font-semibold">Parts supplier dashboard</h1>
        <p className="text-muted-foreground">
          Supplier data could not be loaded. Check your connection or complete parts supplier onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="psp-page space-y-8">
      <PsSupplierHero
        userName={userName}
        profile={data.profile}
        pendingDispatch={data.pendingDispatch}
        revenueAchieved={data.revenueAchieved}
        revenueTarget={data.revenueTarget}
        topInsight={data.insights[0]}
      />
      <PsMotionSection delay={0.05}>
        <PsMetricGrid metrics={data.metrics} loading={loading} />
      </PsMotionSection>
      <PsMotionSection delay={0.1}>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Smart alerts</h2>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/dashboard/parts/alerts">View all</Link>
            </Button>
          </div>
          <PsAlertsPanel alerts={data.alerts} />
        </section>
      </PsMotionSection>
      <PsMotionSection delay={0.15}>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Order pipeline</h2>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link to="/dashboard/parts/orders">All orders</Link>
            </Button>
          </div>
          <PsOrderPipelineBoard pipeline={data.pipeline} />
        </section>
      </PsMotionSection>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="psp-panel">
          <h3 className="psp-panel__title">AI business assistant</h3>
          <ul className="mt-3 space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="psp-ai-card">
                <p className="font-medium text-foreground">{i.title}</p>
                <p className="text-sm text-muted-foreground">{i.summary}</p>
                {i.actionUrl ? (
                  <Link to={i.actionUrl} className="mt-1 inline-block text-xs text-primary hover:underline">
                    {i.actionLabel ?? "Open"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        <section className="psp-panel">
          <h3 className="psp-panel__title">Warehouses</h3>
          <ul className="mt-3 space-y-2">
            {data.warehouses.map((w) => (
              <li key={w.id} className="flex justify-between text-sm">
                <span>
                  {w.name} · {w.city}
                </span>
                <span className="text-primary">{w.utilizationPct}% full</span>
              </li>
            ))}
          </ul>
          <Button variant="link" className="mt-2 h-auto p-0 text-primary" asChild>
            <Link to="/dashboard/parts/warehouses">Manage warehouses</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

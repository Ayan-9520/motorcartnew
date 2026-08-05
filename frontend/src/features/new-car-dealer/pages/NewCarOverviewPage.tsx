import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewCarDealerHero } from "../components/NewCarDealerHero";
import { NcdMetricGrid } from "../components/NcdMetricGrid";
import { NcdLeadPipeline } from "../components/NcdLeadPipeline";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { setPageMeta } from "@/utils/seo";

export function NewCarOverviewPage() {
  const { data, loading, refresh, userName } = useNewCarDealerOS();

  useEffect(() => {
    setPageMeta({ title: "New Car Dealer OS", description: "Showroom command center." });
  }, []);

  const topInsight = data?.insights[0];

  return (
    <div className="ncd-page space-y-8">
      <NewCarDealerHero
        userName={userName}
        showroom={data?.showroom ?? { id: "", name: "Showroom", brand: "Hyundai", city: "Pune", status: "live", monthlyTarget: 85, monthlyAchieved: 0, carsSoldMtd: 0 }}
        hotLeadsCount={data?.hotLeadsCount ?? 0}
        topInsight={topInsight}
      />

      <section>
        <div className="ncd-section-head">
          <h2 className="ncd-section-title">Showroom performance</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/new-car/analytics">
              Analytics <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <NcdMetricGrid metrics={data?.metrics ?? []} loading={loading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ncd-panel">
          <h3 className="ncd-panel__title">Monthly sales</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.salesChart ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="units" stroke="hsl(142 76% 45%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="ncd-panel">
          <h3 className="ncd-panel__title">Lead sources</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.leadSourceChart ?? []}>
                <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(142 76% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="ncd-panel">
        <div className="flex items-center justify-between">
          <h3 className="ncd-panel__title">Lead pipeline</h3>
          <Button size="sm" variant="outline" className="rounded-lg" asChild>
            <Link to="/dashboard/new-car/leads">Full CRM</Link>
          </Button>
        </div>
        <NcdLeadPipeline leads={data?.leads ?? []} compact onStageChange={() => void refresh()} />
      </section>

      {data?.insights.length ? (
        <section className="ncd-panel">
          <h3 className="ncd-panel__title flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-500" /> AI business assistant
          </h3>
          <ul className="grid gap-3 md:grid-cols-3">
            {data.insights.map((ins) => (
              <li key={ins.id} className="ncd-ai-card">
                <p className="font-medium">{ins.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ins.summary}</p>
                {ins.actionUrl ? (
                  <Link to={ins.actionUrl} className="mt-2 text-xs font-semibold text-emerald-600 hover:underline">
                    {ins.actionLabel}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

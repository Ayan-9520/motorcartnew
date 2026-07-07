import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/features/service-booking/components/BookingCalendar";
import { ShKanbanBoard } from "../components/ShKanbanBoard";
import { ShMetricGrid } from "../components/ShMetricGrid";
import { ShWorkshopHero } from "../components/ShWorkshopHero";
import { useServicePartnerOS } from "../hooks/useServicePartnerOS";
import { setPageMeta } from "@/utils/seo";

export function ShOverviewPage() {
  const { data, loading, userName } = useServicePartnerOS();

  useEffect(() => setPageMeta({ title: "Service hub dashboard" }), []);

  if (loading && !data) {
    return <div className="sh-page sh-loading">Loading workshop desk…</div>;
  }
  if (!data) {
    return (
      <div className="sh-page space-y-4 p-6">
        <h1 className="text-xl font-semibold">Service hub dashboard</h1>
        <p className="text-muted-foreground">
          Workshop data could not be loaded. Check your connection or complete service partner onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="sh-page space-y-8">
      <ShWorkshopHero
        userName={userName}
        profile={data.profile}
        activeVehicles={data.activeVehicles}
        topInsight={data.insights[0]}
      />
      <ShMetricGrid metrics={data.metrics} loading={loading} />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workflow board</h2>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to="/dashboard/service/workshop/kanban">Full board</Link>
          </Button>
        </div>
        <ShKanbanBoard columns={data.kanban} />
      </section>
      {data.bookings.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">This week</h2>
          <BookingCalendar bookings={data.bookings} days={7} />
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="sh-glass-card">
          <h3 className="sh-panel__title">AI workshop assistant</h3>
          <ul className="mt-3 space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="sh-ai-card">
                <p className="font-medium">{i.title}</p>
                <p className="text-sm text-muted-foreground">{i.summary}</p>
                {i.actionUrl ? (
                  <Link to={i.actionUrl} className="mt-1 inline-block text-xs text-primary hover:underline">
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        <section className="sh-glass-card">
          <h3 className="sh-panel__title">Technicians on floor</h3>
          <ul className="mt-3 space-y-2">
            {data.technicians.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>
                  {t.name} · <span className="text-muted-foreground">{t.skill}</span>
                </span>
                <span className="text-primary">{t.jobsToday} jobs</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

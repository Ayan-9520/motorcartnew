import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { setPageMeta } from "@/utils/seo";

export function NewCarTeamPage() {
  const { data } = useNewCarDealerOS();
  useEffect(() => setPageMeta({ title: "Team" }), []);

  return (
    <NewCarDealerShell title="Team & targets" description="Executives, finance, insurance, delivery — incentives & attendance.">
      {(data?.staff ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Invite sales executives from{" "}
          <Link to="/dashboard/dealer/team" className="text-primary hover:underline">
            Dealer team settings
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.staff ?? []).map((s) => (
            <article key={s.id} className="ncd-panel">
              <p className="font-semibold">{s.fullName}</p>
              <p className="text-xs text-muted-foreground">{s.role}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{s.carsSoldMtd}</p>
              <p className="text-[10px] text-muted-foreground">cars MTD · target {s.monthlyTarget || "—"}</p>
              <p className="text-xs">{s.leadsAssigned} leads assigned</p>
            </article>
          ))}
        </div>
      )}
      <Button variant="outline" className="mt-4 rounded-xl" asChild>
        <Link to="/dashboard/new-car/settings">Showroom settings</Link>
      </Button>
    </NewCarDealerShell>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { setPageMeta } from "@/utils/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminFlows } from "../services/platform-admin.service";
import type { AdminFlowRow } from "../types";
import { SuperAdminShell } from "../components/SuperAdminShell";
import { PLATFORM_ROLE_WORKSPACES } from "../config/role-workspaces";

const QUICK_LINKS = [
  { to: "/dashboard/super-admin/business-approvals", label: "Business approvals" },
  { to: "/dashboard/super-admin/finance-approvals", label: "Fintech / loans" },
  { to: "/dashboard/super-admin/kyc", label: "KYC queue" },
  { to: "/dashboard/super-admin/users", label: "All users" },
  { to: "/dashboard/super-admin/roles", label: "Role directory" },
];

export function AdminOperationsPage() {
  const [flows, setFlows] = useState<AdminFlowRow[]>([]);

  useEffect(() => {
    setPageMeta({ title: "How admin works — Motorcart" });
    void fetchAdminFlows().then(setFlows);
  }, []);

  return (
    <SuperAdminShell
      title="Operations map"
      description="Trace data sources, admin actions, and customer outcomes across the Motorcart ecosystem — end to end."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            {l.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>

      <section className="sa-section mb-8">
        <h2 className="sa-section__title mb-3">Data flows (real backend)</h2>
        <div className="space-y-3">
          {flows.map((f) => (
            <Card key={f.id} className="border-border/80 bg-card/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-muted-foreground">FROM</p>
                  <p className="font-mono text-foreground/90">{f.from}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">STORES</p>
                  <p className="font-mono text-foreground/90">{f.stores}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">ADMIN ACTION</p>
                  <p className="font-mono text-primary">{f.admin}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">RESULT</p>
                  <p className="font-mono text-foreground/90">{f.result}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="sa-section">
        <h2 className="sa-section__title mb-3">Roles → dashboards</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Signup</th>
                <th className="px-3 py-2">Admin approval?</th>
                <th className="px-3 py-2">Workspace</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_ROLE_WORKSPACES.map((r) => (
                <tr key={r.role} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">{r.label}</td>
                  <td className="px-3 py-2 capitalize">{r.signupType}</td>
                  <td className="px-3 py-2">{r.needsAdminApproval ? "Yes" : "—"}</td>
                  <td className="px-3 py-2">
                    <Link to={r.dashboardPath} className="text-primary hover:underline">
                      {r.dashboardPath}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SuperAdminShell>
  );
}

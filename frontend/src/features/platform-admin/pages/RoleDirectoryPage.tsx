import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageMeta } from "@/utils/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_ROLE_WORKSPACES } from "../config/role-workspaces";
import { SuperAdminShell } from "../components/SuperAdminShell";

export function RoleDirectoryPage() {
  useEffect(() => {
    setPageMeta({ title: "Role directory — Super Admin" });
  }, []);

  return (
    <SuperAdminShell
      title="Role & workspace directory"
      description="Every Motorcart role, signup type, and dashboard URL. Use when routing users or testing workspaces."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PLATFORM_ROLE_WORKSPACES.map((row) => (
          <Card key={row.role} className="border-border/80 bg-card/90">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{row.label}</CardTitle>
              <CardDescription className="font-mono text-xs">{row.role}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Dashboard:{" "}
                <Link to={row.dashboardPath} className="font-medium text-primary hover:underline">
                  {row.dashboardPath}
                </Link>
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{row.signupType}</Badge>
                {row.needsAdminApproval ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Admin approval</Badge>
                ) : (
                  <Badge variant="secondary">Auto active</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SuperAdminShell>
  );
}

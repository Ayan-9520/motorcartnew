import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, FileCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { DashboardPageShell } from "@/shared/layout/DashboardPageShell";
import {
  ROLE_DISPLAY_NAMES,
  isAccountPendingApproval,
} from "@/auth/ecosystem-roles";
import { getRoleDashboardPath } from "@/auth/get-role-dashboard-path";
import type { AppRole } from "@/types/database";
import { setPageMeta } from "@/utils/seo";
import { fetchUserProfile } from "@/services/auth.service";
import { mapDbUserToAppUser } from "@/services/mapUser";

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const rejected = user?.approvalStatus === "rejected";

  useEffect(() => {
    setPageMeta({
      title: "Pending approval",
      description: "Your business application is under Motorcart review.",
    });
  }, []);

  useEffect(() => {
    if (!user?.id || rejected) return;

    const poll = async () => {
      const row = await fetchUserProfile(user.id);
      if (!row) return;
      const mapped = mapDbUserToAppUser(row);
      setUser(mapped);
      if (!isAccountPendingApproval(mapped)) {
        navigate(getRoleDashboardPath(mapped), { replace: true });
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 20_000);
    return () => window.clearInterval(timer);
  }, [user?.id, rejected, navigate, setUser]);

  const roleLabel = user ? ROLE_DISPLAY_NAMES[user.role as AppRole] ?? user.role : "Business";
  const statusLabel = user?.approvalStatus ?? user?.accountStatus ?? "pending";

  return (
    <DashboardPageShell
      title={rejected ? "Application not approved" : "Application under review"}
      description={
        rejected
          ? `${roleLabel} account — please contact Motorcart support or re-submit documents.`
          : `${roleLabel} account — Motorcart admin approval required before CRM, inventory, and fintech tools unlock.`
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-primary/20 bg-card/90 shadow-card backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </span>
              <div>
                <CardTitle>{rejected ? "Application rejected" : "Pending admin approval"}</CardTitle>
                <CardDescription>
                  Status: <strong className="text-foreground">{statusLabel}</strong>
                  {user?.companyName ? ` · ${user.companyName}` : null}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Your account is registered but <strong className="text-foreground">dashboard access is locked</strong>{" "}
              until a Motorcart super admin approves your business application (typically 24–48 business hours).
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Admin reviews GSTIN, company details, and documents from your signup.
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                After approval, your dealer / DSA / parts / service workspace opens automatically on this page.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/profile">View profile</Link>
              </Button>
              <Button variant="ghost" className="rounded-xl" asChild>
                <Link to="/">Back to marketplace</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}

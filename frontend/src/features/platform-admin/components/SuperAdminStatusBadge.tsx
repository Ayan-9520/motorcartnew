import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  active: "sa-badge--ok",
  verified: "sa-badge--ok",
  published: "sa-badge--ok",
  sent: "sa-badge--ok",
  cleared: "sa-badge--ok",
  resolved: "sa-badge--ok",
  closed: "sa-badge--muted",
  open: "sa-badge--warn",
  pending: "sa-badge--warn",
  pending_verification: "sa-badge--warn",
  under_review: "sa-badge--warn",
  approved: "sa-badge--ok",
  submitted: "sa-badge--warn",
  reviewing: "sa-badge--warn",
  suspended: "sa-badge--danger",
  rejected: "sa-badge--danger",
  blocked: "sa-badge--danger",
  urgent: "sa-badge--danger",
  high: "sa-badge--warn",
};

export function SuperAdminStatusBadge({ status }: { status: string }) {
  const tone = TONE[status] ?? "sa-badge--muted";
  return <span className={cn("sa-badge", tone)}>{status.replace(/_/g, " ")}</span>;
}

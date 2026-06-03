import { DealerOverviewPage } from "@/router/lazy-pages";

/** `/dashboard/dealer` — pre-owned / used dealers only (new-car users redirected by DealerWorkspaceGuard). */
export function DealerHomeGate() {
  return <DealerOverviewPage />;
}

import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { DealerConsoleShell, type ConsoleCrumb } from "@/features/dealer-crm/components/DealerConsoleShell";
import { NewCarDealerShell } from "@/features/new-car-dealer/components/NewCarDealerShell";

export function useQuotationWorkspace() {
  const { pathname } = useLocation();
  const ncd = pathname.startsWith("/dashboard/new-car");
  return {
    ncd,
    basePath: ncd ? "/dashboard/new-car/quotations" : "/dashboard/dealer/quotations",
    homeLabel: ncd ? "New Car OS" : "Dealer OS",
  };
}

export function QuotationWorkspaceShell({
  title,
  description,
  crumbs,
  actions,
  children,
}: {
  title: string;
  description?: string;
  crumbs?: ConsoleCrumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { ncd } = useQuotationWorkspace();
  if (ncd) {
    return (
      <NewCarDealerShell title={title} description={description} crumbs={crumbs} actions={actions}>
        {children}
      </NewCarDealerShell>
    );
  }
  return (
    <DealerConsoleShell title={title} description={description} crumbs={crumbs} actions={actions}>
      {children}
    </DealerConsoleShell>
  );
}

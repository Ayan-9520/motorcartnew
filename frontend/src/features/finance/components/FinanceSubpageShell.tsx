import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceHubCategoryId } from "../data/finance-hub-categories";
import { financeCategoryLabel } from "../lib/finance-hub-routes";

interface FinanceSubpageShellProps {
  title: string;
  subtitle: string;
  loanType?: FinanceHubCategoryId;
  children: React.ReactNode;
  className?: string;
}

export function FinanceSubpageShell({
  title,
  subtitle,
  loanType,
  children,
  className,
}: FinanceSubpageShellProps) {
  return (
    <div className={cn("finance-subpage min-h-screen min-w-0 overflow-x-hidden pb-14", className)}>
      <div className="finance-subpage-hero border-b border-border/80">
        <div className="container py-6 md:py-8">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link to="/finance" className="hover:text-primary">
              Finance
            </Link>
            {loanType ? (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{financeCategoryLabel(loanType)}</span>
              </>
            ) : null}
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
        </div>
      </div>
      <div className="container min-w-0 pt-6 md:pt-8">{children}</div>
    </div>
  );
}

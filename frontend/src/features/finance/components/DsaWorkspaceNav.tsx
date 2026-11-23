import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  FileWarning,
  Gauge,
  LayoutDashboard,
  Landmark,
  Plug,
  Users,
  Wallet,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/dashboard/dsa", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/dsa/applications", label: "Applications", icon: Landmark },
  { to: "/dashboard/dsa/leads", label: "Lead CRM", icon: Gauge },
  { to: "/dashboard/dsa/integrations", label: "Bank APIs", icon: Plug },
  { to: "/dashboard/dsa/team", label: "Team", icon: Users },
  { to: "/dashboard/dsa/plans", label: "Plans", icon: CreditCard },
] as const;

export function DsaWorkspaceNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fin-dsa-nav" aria-label="DSA workspace">
      {LINKS.map(({ to, label, icon: Icon, ...rest }) => {
        const end = "end" in rest && rest.end;
        const active = end ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn("fin-dsa-nav__link", active && "fin-dsa-nav__link--active")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
      <Link to="/finance/offers" className="fin-dsa-nav__link fin-dsa-nav__link--muted">
        <Building2 className="h-4 w-4" />
        Loan marketplace
      </Link>
      <Link to="/finance/tools" className="fin-dsa-nav__link fin-dsa-nav__link--muted">
        <FileWarning className="h-4 w-4" />
        EMI & eligibility
      </Link>
      <Link to="/dashboard/dsa#commissions" className="fin-dsa-nav__link fin-dsa-nav__link--muted">
        <Wallet className="h-4 w-4" />
        Commissions
      </Link>
    </nav>
  );
}

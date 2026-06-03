import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthPathCardProps = {
  to: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: ReactNode;
  variant?: "customer" | "business";
};

function AuthPathCard({ to, title, subtitle, badge, icon, variant = "customer" }: AuthPathCardProps) {
  return (
    <Link
      to={to}
      className={cn("auth-path-card group", variant === "business" && "auth-path-card--business")}
    >
      <span className="auth-path-card__icon">{icon}</span>
      <div className="auth-path-card__body">
        <div className="auth-path-card__meta">
          <span className="auth-path-card__badge">{badge}</span>
          <ArrowRight className="auth-path-card__arrow h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />
        </div>
        <h2 className="auth-path-card__title">{title}</h2>
        <p className="auth-path-card__desc">{subtitle}</p>
      </div>
    </Link>
  );
}

export function AuthPathCards() {
  return (
    <div className="auth-path-grid">
      <AuthPathCard
        to="/signup/customer"
        variant="customer"
        badge="Personal"
        title="Customer"
        subtitle="Garage, loans, insurance & auctions"
        icon={<UserRound className="h-5 w-5" />}
      />
      <AuthPathCard
        to="/signup/business"
        variant="business"
        badge="Business · KYC"
        title="Business"
        subtitle="Dealer OS, GST & admin approval"
        icon={<Building2 className="h-5 w-5" />}
      />
    </div>
  );
}

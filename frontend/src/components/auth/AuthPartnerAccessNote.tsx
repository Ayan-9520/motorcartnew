import { Building2, Package, TrendingUp, Wrench } from "lucide-react";

const ROLES = [
  { icon: Building2, label: "Dealers & showrooms" },
  { icon: TrendingUp, label: "DSA & finance partners" },
  { icon: Package, label: "Parts suppliers" },
  { icon: Wrench, label: "Service & garages" },
];

export function AuthPartnerAccessNote() {
  return (
    <div className="auth-partner-note">
      <p className="auth-partner-note__title">Sign in is for verified business workspaces</p>
      <ul className="auth-partner-note__list">
        {ROLES.map(({ icon: Icon, label }) => (
          <li key={label}>
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

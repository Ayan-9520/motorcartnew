import { Link, useLocation } from "react-router-dom";
import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthRoleSwitchProps = {
  mode: "login" | "signup";
};

/** Customer vs Business — side by side, always visible. */
export function AuthRoleSwitch({ mode }: AuthRoleSwitchProps) {
  const { pathname } = useLocation();

  const customerActive = mode === "signup" && pathname === "/signup/customer";
  const businessActive = mode === "signup" && pathname === "/signup/business";

  return (
    <div className="auth-role-switch" role="tablist" aria-label="Account type">
      <Link
        to="/signup/customer"
        className={cn("auth-role-switch__btn", customerActive && "auth-role-switch__btn--active")}
        role="tab"
        aria-selected={customerActive}
      >
        <UserRound className="h-4 w-4 shrink-0" />
        <span>Customer</span>
      </Link>
      <Link
        to="/signup/business"
        className={cn("auth-role-switch__btn", businessActive && "auth-role-switch__btn--active")}
        role="tab"
        aria-selected={businessActive}
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span>Business</span>
      </Link>
    </div>
  );
}

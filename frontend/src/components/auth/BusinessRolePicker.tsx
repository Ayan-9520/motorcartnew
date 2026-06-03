import { Car, Landmark, Package, Store, Wrench } from "lucide-react";
import type { AppRole } from "@/types/database";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Partial<Record<AppRole, typeof Car>> = {
  dealer: Store,
  used_car_dealer: Car,
  new_car_dealer: Car,
  dsa_agent: Landmark,
  parts_seller: Package,
  service_center: Wrench,
};

type Option = { value: AppRole; label: string };

type BusinessRolePickerProps = {
  value: AppRole;
  onChange: (role: AppRole) => void;
  options: Option[];
  disabled?: boolean;
  error?: string;
};

export function BusinessRolePicker({ value, onChange, options, disabled, error }: BusinessRolePickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => {
          const Icon = ROLE_ICONS[opt.value] ?? Store;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "auth-role-chip",
                active && "auth-role-chip--active"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-left text-[11px] font-semibold leading-tight sm:text-xs">{opt.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

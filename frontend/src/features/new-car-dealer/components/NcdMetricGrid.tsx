import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  Car,
  ClipboardList,
  Package,
  PackageOpen,
  PackageX,
  TriangleAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NcdAnimatedStat } from "./NcdAnimatedStat";
import type { NcdMetric } from "../types";

const METRIC_ICONS: Record<string, typeof Car> = {
  stock: Package,
  available: Car,
  out_of_stock: PackageX,
  low_stock: TriangleAlert,
  leads: Users,
  open_leads: Users,
  test_drives: CalendarCheck2,
  bookings: ClipboardList,
  delivered: PackageOpen,
  delivered_stage: PackageOpen,
};

function iconFor(key: string) {
  const k = key.toLowerCase();
  if (METRIC_ICONS[k]) return METRIC_ICONS[k];
  if (k.includes("lead")) return Users;
  if (k.includes("stock") && k.includes("low")) return TriangleAlert;
  if (k.includes("out")) return PackageX;
  if (k.includes("available") || k.includes("inventory")) return Package;
  if (k.includes("test")) return CalendarCheck2;
  if (k.includes("book")) return ClipboardList;
  if (k.includes("deliver")) return PackageOpen;
  return Car;
}

export function NcdMetricGrid({ metrics, loading }: { metrics: NcdMetric[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="ncd-metric-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="ncd-metric ncd-metric--skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="ncd-metric-grid">
      {metrics.map((m) => {
        const Icon = iconFor(m.key);
        const inner = (
          <>
            <div className="ncd-metric__top">
              <p className="ncd-metric__label">{m.label}</p>
              <span className="ncd-metric__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="ncd-metric__value">
              {typeof m.value === "number" ? <NcdAnimatedStat value={m.value} /> : m.value}
            </p>
            {m.sublabel ? <p className="ncd-metric__sub">{m.sublabel}</p> : null}
            {m.trend != null ? (
              <span
                className={cn(
                  "ncd-metric__trend",
                  m.trend >= 0 ? "ncd-metric__trend--up" : "ncd-metric__trend--down",
                )}
              >
                {m.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(m.trend)}% {m.trendLabel ?? ""}
              </span>
            ) : null}
          </>
        );
        const cls = cn(
          "ncd-metric ncd-metric--premium-tile",
          m.variant === "premium" && "ncd-metric--premium",
          m.variant === "success" && "ncd-metric--success",
          m.variant === "warning" && "ncd-metric--warning",
        );
        return m.href ? (
          <Link key={m.key} to={m.href} className={cls}>
            {inner}
          </Link>
        ) : (
          <div key={m.key} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

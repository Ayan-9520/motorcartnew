import { useState } from "react";
import { Specifications } from "./Specifications";
import { VehicleAIInsights } from "./VehicleAIInsights";
import { EmiCalculator } from "./EmiCalculator";
import { LoanEligibility } from "./LoanEligibility";
import { DealerDetails } from "./DealerDetails";
import type { VehicleListing } from "@/types/vehicle";
import { cn } from "@/lib/utils";
import { Shield, FileCheck, Landmark, ClipboardList } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "specs", label: "Specs" },
  { id: "ownership", label: "Ownership" },
  { id: "finance", label: "Finance" },
  { id: "insurance", label: "Insurance" },
  { id: "inspection", label: "Inspection" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function VehicleDetailTabs({ vehicle }: { vehicle: VehicleListing }) {
  const [tab, setTab] = useState<TabId>("overview");
  const tabs = vehicle.condition === "new" ? TABS.filter((t) => t.id !== "ownership") : TABS;

  return (
    <div className="vm-detail-tabs">
      <div className="vm-detail-tab-rail" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn("vm-detail-tab", tab === t.id && "vm-detail-tab-active")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="vm-detail-tab-panel">
        {tab === "overview" && (
          <div className="space-y-6">
            <VehicleAIInsights vehicle={vehicle} />
            {vehicle.description && (
              <div>
                <h3 className="font-semibold mb-2">Overview</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{vehicle.description}</p>
              </div>
            )}
            {vehicle.features.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Highlights</h3>
                <ul className="flex flex-wrap gap-2">
                  {vehicle.features.map((f) => (
                    <li key={f} className="vm-feature-chip">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "specs" && <Specifications vehicle={vehicle} />}

        {tab === "ownership" && (
          <dl className="vm-spec-grid">
            <div><dt>Owners</dt><dd>{vehicle.owners}</dd></div>
            <div><dt>Registration</dt><dd>{vehicle.metadata?.rto || vehicle.state}</dd></div>
            <div><dt>KMs driven</dt><dd>{vehicle.kmsDriven.toLocaleString("en-IN")} km</dd></div>
            <div><dt>Condition</dt><dd className="capitalize">{vehicle.condition}</dd></div>
            <div><dt>RC transfer</dt><dd>Assisted by dealer</dd></div>
            <div><dt>Service history</dt><dd>{vehicle.isCertified ? "Available" : "On request"}</dd></div>
          </dl>
        )}

        {tab === "finance" && (
          <div className="space-y-4">
            <EmiCalculator vehicle={vehicle} />
            <LoanEligibility />
          </div>
        )}

        {tab === "insurance" && (
          <div className="vm-insurance-panel">
            <Landmark className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Insurance estimates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive cover from ₹{Math.round(vehicle.price * 0.032).toLocaleString("en-IN")}/yr ·
              Third-party from ₹{Math.round(vehicle.price * 0.012).toLocaleString("en-IN")}/yr
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Final premium depends on NCB, add-ons & insurer. Compare on Motorcart insurance hub.
            </p>
          </div>
        )}

        {tab === "inspection" && (
          <ul className="space-y-2">
            {[
              { icon: FileCheck, label: "Exterior & paint", ok: true },
              { icon: ClipboardList, label: "Engine & transmission", ok: vehicle.kmsDriven < 80000 },
              { icon: Shield, label: "Accident history", ok: vehicle.isCertified },
              { icon: FileCheck, label: "OBD diagnostics", ok: vehicle.year >= 2018 },
            ].map((row) => (
              <li key={row.label} className="vm-inspection-row">
                <row.icon className="h-4 w-4 text-primary" />
                <span className="flex-1 text-sm">{row.label}</span>
                <span className={cn("text-xs font-semibold", row.ok ? "text-primary" : "text-amber-600")}>
                  {row.ok ? "Pass" : "Check"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DealerDetails vehicle={vehicle} />
    </div>
  );
}

import { Link } from "react-router-dom";
import { Crown, Shield, Store } from "lucide-react";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { WorkspaceAccountProfile } from "@/dashboards/components/WorkspaceAccountProfile";
import { useDealer } from "../hooks/useDealer";
import { setPageMeta } from "@/utils/seo";
import { useEffect } from "react";

const LINKS = [
  { href: "/dashboard/dealer/storefront", label: "Public storefront", icon: Store, desc: "SEO, contact & visibility" },
  { href: "/dashboard/dealer/verification", label: "Verification & KYC", icon: Shield, desc: "GST, PAN, documents" },
  { href: "/dashboard/dealer/subscription", label: "Subscription plans", icon: Crown, desc: "Free, Premium, Enterprise" },
];

export function DealerSettingsPage() {
  const { dealer, refetch } = useDealer();

  useEffect(() => {
    setPageMeta({ title: "Account & settings" });
  }, []);

  return (
    <DealerConsoleShell
      title="Account & settings"
      description="Edit your login and dealership profile. Sidebar account card opens this page."
      crumbs={[{ label: "Settings" }]}
    >
      <WorkspaceAccountProfile dealer={dealer} onDealerSaved={() => void refetch()} />

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">More settings</h3>
        <div className="dealer-os-quick-grid">
          {LINKS.map((l) => (
            <Link key={l.href} to={l.href} className="dealer-os-quick-link">
              <l.icon className="h-5 w-5 text-primary" />
              <span>
                <strong className="block">{l.label}</strong>
                <span className="text-xs font-normal text-muted-foreground">{l.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </DealerConsoleShell>
  );
}

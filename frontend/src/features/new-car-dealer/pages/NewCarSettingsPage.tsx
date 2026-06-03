import { useEffect } from "react";
import { NewCarDealerShell } from "../components/NewCarDealerShell";
import { WorkspaceAccountProfile } from "@/dashboards/components/WorkspaceAccountProfile";
import { useNewCarDealerOS } from "../hooks/useNewCarDealerOS";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { setPageMeta } from "@/utils/seo";

export function NewCarSettingsPage() {
  const { dealer, refetch } = useDealer();
  const { refresh } = useNewCarDealerOS();

  useEffect(() => setPageMeta({ title: "Account & showroom settings" }), []);

  return (
    <NewCarDealerShell
      title="Account & settings"
      description="Edit your profile and showroom details. Click your name in the sidebar to return here."
      crumbs={[{ label: "Settings" }]}
    >
      <WorkspaceAccountProfile
        dealer={dealer}
        onDealerSaved={() => {
          void refetch();
          void refresh();
        }}
      />
    </NewCarDealerShell>
  );
}

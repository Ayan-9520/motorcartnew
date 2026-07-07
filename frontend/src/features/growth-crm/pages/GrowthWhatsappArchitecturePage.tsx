import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags } from "@/config/feature-flags";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import {
  fetchWhatsappArchitecture,
  fetchWhatsappProviderConfig,
  fetchWhatsappQueue,
  processWhatsappQueue,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthWhatsappArchitecturePage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const enabled = featureFlags.growthWhatsappProviders;

  const configQ = useQuery({
    queryKey: ["wa-provider-config"],
    queryFn: () => fetchWhatsappProviderConfig(),
    enabled,
  });
  const archQ = useQuery({
    queryKey: ["wa-arch", workspaceId],
    queryFn: () => fetchWhatsappArchitecture(),
    enabled: enabled && !!workspaceId,
  });
  const queueQ = useQuery({
    queryKey: ["wa-queue", workspaceId],
    queryFn: () => fetchWhatsappQueue(),
    enabled: enabled && !!workspaceId,
  });

  if (!enabled) {
    return (
      <GrowthEmptyState
        title="WhatsApp provider architecture (L1)"
        description="Enable VITE_FEATURE_GROWTH_WHATSAPP_PROVIDERS and backend FEATURE_GROWTH_WHATSAPP_PROVIDERS."
      />
    );
  }

  if (!workspaceId) {
    return (
      <GrowthEmptyState
        title="Select a workspace"
        actionLabel="Workspaces"
        actionTo="/dashboard/growth/workspaces"
      />
    );
  }

  const config = configQ.data?.ok ? configQ.data.data.data : null;
  const arch = archQ.data?.ok ? (archQ.data.data.data as Record<string, unknown>) : null;
  const queue = queueQ.data?.ok ? queueQ.data.data.data : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Link to="/dashboard/growth/whatsapp" className="text-sm text-muted-foreground hover:text-foreground">
          ← WhatsApp CRM
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">WhatsApp provider architecture</h1>
        <p className="text-sm text-muted-foreground">
          Meta Cloud, Gupshup, Twilio stubs — no live API or credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform config</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(config, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace state</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(arch, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Message queue ({queue?.length ?? 0})</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await processWhatsappQueue();
              void queueQ.refetch();
              void archQ.refetch();
            }}
          >
            Process stub queue
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs max-h-64">
            {JSON.stringify(queue, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

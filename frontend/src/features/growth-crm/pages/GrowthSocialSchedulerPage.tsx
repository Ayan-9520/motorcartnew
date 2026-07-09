import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import {
  fetchSocialAnalytics,
  fetchSocialChannels,
  fetchSocialPublishQueue,
  fetchSocialSchedulerConfig,
  fetchSocialSchedules,
  processSocialPublishQueue,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthSocialSchedulerPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);

  const configQ = useQuery({
    queryKey: ["social-config"],
    queryFn: () => fetchSocialSchedulerConfig(),
    retry: 1,
  });
  const channelsQ = useQuery({
    queryKey: ["social-channels", workspaceId],
    queryFn: () => fetchSocialChannels(),
    enabled: !!workspaceId,
    retry: 1,
  });
  const schedulesQ = useQuery({
    queryKey: ["social-schedules", workspaceId],
    queryFn: () => fetchSocialSchedules(),
    enabled: !!workspaceId,
    retry: 1,
  });
  const queueQ = useQuery({
    queryKey: ["social-queue", workspaceId],
    queryFn: () => fetchSocialPublishQueue(),
    enabled: !!workspaceId,
    retry: 1,
  });
  const analyticsQ = useQuery({
    queryKey: ["social-analytics", workspaceId],
    queryFn: () => fetchSocialAnalytics(),
    enabled: !!workspaceId,
    retry: 1,
  });

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Link to="/dashboard/growth" className="text-sm text-muted-foreground hover:text-foreground">
          ← Growth overview
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Social scheduler</h1>
        <p className="text-sm text-muted-foreground">
          Facebook, Instagram, LinkedIn, YouTube — architecture only, no external APIs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Config</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(config, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs max-h-48">
              {JSON.stringify(channelsQ.data?.ok ? channelsQ.data.data.data : [], null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Publish queue</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await processSocialPublishQueue();
                void queueQ.refetch();
                void schedulesQ.refetch();
                void analyticsQ.refetch();
              }}
            >
              Process stub
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-muted p-3 text-xs max-h-48">
              {JSON.stringify(queueQ.data?.ok ? queueQ.data.data.data : [], null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs max-h-48">
            {JSON.stringify(schedulesQ.data?.ok ? schedulesQ.data.data.data : [], null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics hooks (placeholders)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs max-h-48">
            {JSON.stringify(analyticsQ.data?.ok ? analyticsQ.data.data.data : [], null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

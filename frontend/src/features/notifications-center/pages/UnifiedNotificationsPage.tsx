import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { featureFlags } from "@/config/feature-flags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchNotificationsListApi,
  fetchNotificationsOverviewApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "@/integrations/api/unified-notifications";

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "community", label: "Community" },
  { value: "auction", label: "Auction" },
  { value: "growth", label: "Growth" },
  { value: "lead_router", label: "Lead router" },
  { value: "directory", label: "Directory" },
  { value: "system", label: "System" },
];

export function UnifiedNotificationsPage() {
  const enabled = featureFlags.unifiedNotifications;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [source, setSource] = useState("");

  const overviewQ = useQuery({
    queryKey: ["notifications-overview"],
    queryFn: fetchNotificationsOverviewApi,
    enabled,
  });

  const listQ = useQuery({
    queryKey: ["notifications-list", filter, source],
    queryFn: () =>
      fetchNotificationsListApi({
        unread_only: filter === "unread",
        source: source || undefined,
      }),
    enabled,
  });

  if (!enabled) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Notification center is disabled. Enable VITE_FEATURE_M4_NOTIFICATIONS.
      </div>
    );
  }

  const items = listQ.data?.items ?? [];

  const handleMarkRead = async (id: string) => {
    await markNotificationReadApi(id);
    void qc.invalidateQueries({ queryKey: ["notifications-overview"] });
    void qc.invalidateQueries({ queryKey: ["notifications-list"] });
  };

  const handleMarkAll = async () => {
    await markAllNotificationsReadApi();
    void qc.invalidateQueries({ queryKey: ["notifications-overview"] });
    void qc.invalidateQueries({ queryKey: ["notifications-list"] });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {overviewQ.data && (
            <Badge variant="secondary">{overviewQ.data.unread} unread</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleMarkAll()}>
          <CheckCheck className="h-4 w-4 mr-1" />
          Mark all read
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread only
        </Button>
        <select
          className="text-sm border rounded-md px-2 py-1 bg-background"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {listQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!listQ.isLoading && !items.length && (
        <p className="text-sm text-muted-foreground">No notifications match your filters.</p>
      )}

      <ul className="space-y-3">
        {items.map((n) => (
          <Card key={n.id} className={n.is_read ? "opacity-75" : ""}>
            <CardHeader className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base font-medium">{n.title}</CardTitle>
                <Badge variant="outline">{n.source}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 text-sm">
              <p className="text-muted-foreground line-clamp-2">{n.body}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link to={n.deep_link}>Open</Link>
                </Button>
                {!n.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </ul>
    </div>
  );
}

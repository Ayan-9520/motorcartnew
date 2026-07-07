import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrowthEmptyState } from "@/features/growth-crm/components/GrowthEmptyState";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  createBroadcast,
  createContactList,
  createWaTemplate,
  fetchBroadcasts,
  fetchContactLists,
  fetchWaTemplates,
  mockSendBroadcast,
} from "@/features/growth-crm/services/growth-api.service";
import { useGrowthWorkspaceStore } from "@/features/growth-crm/store/growthWorkspaceStore";

export function GrowthWhatsappPage() {
  const workspaceId = useGrowthWorkspaceStore((s) => s.workspaceId);
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [lists, setLists] = useState<Record<string, unknown>[]>([]);
  const [broadcasts, setBroadcasts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const [tplKey, setTplKey] = useState("");
  const [tplName, setTplName] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [listName, setListName] = useState("");
  const [bcName, setBcName] = useState("");
  const [bcTemplateId, setBcTemplateId] = useState("");
  const [bcListId, setBcListId] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [t, l, b] = await Promise.all([
      fetchWaTemplates(),
      fetchContactLists(),
      fetchBroadcasts(),
    ]);
    if (t.ok) setTemplates(t.data.data ?? []);
    if (l.ok) setLists(l.data.data ?? []);
    if (b.ok) setBroadcasts(b.data.data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!workspaceId) {
    return (
      <GrowthEmptyState
        title="Select a workspace"
        actionLabel="Workspaces"
        actionTo="/dashboard/growth/workspaces"
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp marketing</h1>
      <p className="text-sm text-muted-foreground">
        Mock send only — no Meta or provider integration.
      </p>

      {loading ? (
        <GrowthLoadingState />
      ) : (
        <Tabs defaultValue="templates">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="lists">Contact lists</TabsTrigger>
            <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <Card className="p-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Template key</Label>
                <Input value={tplKey} onChange={(e) => setTplKey(e.target.value)} />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Body</Label>
                <Input value={tplBody} onChange={(e) => setTplBody(e.target.value)} />
              </div>
              <Button
                className="sm:col-span-2"
                size="sm"
                onClick={() =>
                  void createWaTemplate({
                    template_key: tplKey,
                    name: tplName,
                    body: tplBody,
                  }).then(load)
                }
              >
                Add template
              </Button>
            </Card>
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={String(t.id)}>
                  <Card className="p-3 flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{String(t.name)}</p>
                      <p className="text-xs text-muted-foreground">{String(t.template_key)}</p>
                    </div>
                    <Badge variant="secondary">{String(t.status)}</Badge>
                  </Card>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="lists" className="space-y-4 mt-4">
            <Card className="p-4 flex gap-2">
              <Input
                placeholder="List name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => void createContactList({ name: listName }).then(load)}
              >
                Add list
              </Button>
            </Card>
            <ul className="space-y-2">
              {lists.map((l) => (
                <li key={String(l.id)}>
                  <Card className="p-3">
                    <p className="font-medium text-sm">{String(l.name)}</p>
                    <p className="text-xs text-muted-foreground">
                      Members: {String((l as { _count?: { members: number } })._count?.members ?? 0)}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="broadcasts" className="space-y-4 mt-4">
            <Card className="p-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input value={bcName} onChange={(e) => setBcName(e.target.value)} />
              </div>
              <div>
                <Label>Template</Label>
                <select
                  className="w-full h-10 rounded-md border px-2 text-sm"
                  value={bcTemplateId}
                  onChange={(e) => setBcTemplateId(e.target.value)}
                >
                  <option value="">Select</option>
                  {templates.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {String(t.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Contact list</Label>
                <select
                  className="w-full h-10 rounded-md border px-2 text-sm"
                  value={bcListId}
                  onChange={(e) => setBcListId(e.target.value)}
                >
                  <option value="">Select</option>
                  {lists.map((l) => (
                    <option key={String(l.id)} value={String(l.id)}>
                      {String(l.name)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="sm:col-span-2"
                size="sm"
                onClick={() =>
                  void createBroadcast({
                    name: bcName,
                    template_id: bcTemplateId,
                    list_id: bcListId,
                  }).then(load)
                }
              >
                Create broadcast
              </Button>
            </Card>
            <ul className="space-y-2">
              {broadcasts.map((b) => (
                <li key={String(b.id)}>
                  <Card className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{String(b.name)}</p>
                      <Badge variant="outline" className="mt-1">
                        {String(b.status)}
                      </Badge>
                    </div>
                    {String(b.status) === "draft" || String(b.status) === "scheduled" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void mockSendBroadcast(String(b.id)).then(load)}
                      >
                        Mock send
                      </Button>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

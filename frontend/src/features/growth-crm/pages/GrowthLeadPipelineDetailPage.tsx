import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { GrowthLoadingState } from "@/features/growth-crm/components/GrowthLoadingState";
import {
  addPipelineLeadActivity,
  addPipelineLeadNote,
  fetchPipelineLead,
  PIPELINE_STAGES,
  updatePipelineLead,
} from "@/features/growth-crm/services/growth-api.service";

export function GrowthLeadPipelineDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [followUp, setFollowUp] = useState("");

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    const res = await fetchPipelineLead(eventId);
    if (res.ok) {
      setLead(res.data.data);
      setAssigneeId(String(res.data.data.assignee_user_id ?? ""));
      setAssigneeName(String(res.data.data.assignee_name ?? ""));
      setFollowUp(String(res.data.data.follow_up_at ?? "").slice(0, 16));
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  if (loading) return <GrowthLoadingState rows={6} />;
  if (!lead) return <p className="text-sm text-muted-foreground">Lead not found</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/dashboard/growth/leads/pipeline" className="text-sm text-muted-foreground hover:text-foreground">
        ← Pipeline
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Lead detail</h1>
        <Badge>{String(lead.pipeline_stage)}</Badge>
      </div>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-medium">Pipeline stage</p>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={String(lead.pipeline_stage) === s ? "default" : "outline"}
              onClick={() =>
                void updatePipelineLead(String(eventId), { pipeline_stage: s }).then(load)
              }
            >
              {s.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">Assignee user ID</label>
          <Input value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Assignee name</label>
          <Input value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Follow-up (datetime-local)</label>
          <Input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>
        <Button
          className="sm:col-span-2"
          size="sm"
          onClick={() =>
            void updatePipelineLead(String(eventId), {
              assignee_user_id: assigneeId || null,
              assignee_name: assigneeName || null,
              follow_up_at: followUp ? new Date(followUp).toISOString() : null,
            }).then(load)
          }
        >
          Save assignment
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-medium">Add note</p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <Button
          size="sm"
          onClick={() =>
            void addPipelineLeadNote(String(eventId), note).then(() => {
              setNote("");
              return load();
            })
          }
        >
          Save note
        </Button>
        <ul className="space-y-2 text-sm">
          {((lead.notes as unknown[]) ?? []).map((n) => (
            <li key={String((n as Record<string, unknown>).id)} className="border rounded p-2">
              {String((n as Record<string, unknown>).text)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium mb-2">Activity</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void addPipelineLeadActivity(String(eventId), {
              type: "call",
              summary: "Follow-up call logged",
            }).then(load)
          }
        >
          Log call activity
        </Button>
        <ul className="mt-3 space-y-2 text-xs">
          {((lead.activities as unknown[]) ?? []).map((a) => (
            <li key={String((a as Record<string, unknown>).id)}>
              [{String((a as Record<string, unknown>).type)}]{" "}
              {String((a as Record<string, unknown>).summary)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-medium mb-2">Status history</p>
        <ul className="text-xs space-y-1">
          {((lead.status_history as unknown[]) ?? []).map((h, i) => (
            <li key={i}>
              {String((h as Record<string, unknown>).from)} →{" "}
              {String((h as Record<string, unknown>).to)} @{" "}
              {String((h as Record<string, unknown>).at)}
            </li>
          ))}
        </ul>
      </Card>

      <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto">
        {JSON.stringify(lead.lead_fields, null, 2)}
      </pre>
    </div>
  );
}

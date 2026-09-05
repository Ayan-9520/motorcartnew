import { useEffect, useState } from "react";
import { Calendar, FileText, MessageCircle, Phone, StickyNote, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LeadWithMeta, TeamMember } from "../types";
import {
  addLeadNote,
  assignLead,
  fetchLeadNotes,
  type LeadNote,
} from "../services/dealer-enterprise.service";
import { createCrmTask, fetchCrmTasks } from "../services/crm.service";
import { fetchLeadTimeline } from "../services/commos.service";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { AILeadScore, AIDealerAssistant } from "@/ai/ecosystem";

type LeadDetailPanelProps = {
  lead: LeadWithMeta | null;
  dealerId: string;
  team: TeamMember[];
  onUpdated: () => void;
};

export function LeadDetailPanel({ lead, dealerId, team, onUpdated }: LeadDetailPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [assignee, setAssignee] = useState("");

  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!lead) {
      setNotes([]);
      setTimeline(null);
      return;
    }
    void fetchLeadNotes(lead.id).then(setNotes);
    void fetchCrmTasks(dealerId);
    void fetchLeadTimeline(lead.id).then(setTimeline).catch(() => setTimeline(null));
  }, [lead?.id, dealerId]);

  if (!lead) {
    return (
      <div className="dealer-lead-panel dealer-lead-panel-empty">
        <p className="text-sm text-muted-foreground">Select a lead to view timeline, notes & reminders.</p>
      </div>
    );
  }

  const saveNote = async () => {
    if (!noteBody.trim() || !user?.id) return;
    const { error } = await addLeadNote({
      leadId: lead.id,
      dealerId,
      authorId: user.id,
      body: noteBody.trim(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Note saved");
      setNoteBody("");
      setNotes(await fetchLeadNotes(lead.id));
      onUpdated();
    }
  };

  const scheduleReminder = async () => {
    if (!reminderAt) return;
    try {
      await createCrmTask({
        dealerId,
        leadId: lead.id,
        assignedTo: assignee || user?.id,
        title: `Callback — ${lead.name}`,
        dueAt: new Date(reminderAt).toISOString(),
        priority: "high",
      });
      toast.success("Reminder scheduled");
      setReminderAt("");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const onAssign = async () => {
    const { error } = await assignLead(lead.id, assignee || null);
    if (error) toast.error(error.message);
    else {
      toast.success("Lead assigned");
      onUpdated();
    }
  };

  return (
    <div className="dealer-lead-panel">
      <div className="dealer-lead-panel-head">
        <h3 className="font-semibold">{lead.name}</h3>
        <p className="text-xs text-muted-foreground capitalize">{lead.type.replace("_", " ")} · {lead.source}</p>
      </div>

      {timeline ? (
        <p className="px-3 text-xs text-muted-foreground">
          Unified timeline: {(timeline.messages as unknown[] | undefined)?.length ?? 0} messages ·{" "}
          {(timeline.calls as unknown[] | undefined)?.length ?? 0} calls ·{" "}
          {(timeline.activities as unknown[] | undefined)?.length ?? 0} CRM ·{" "}
          {(timeline.quotations as unknown[] | undefined)?.length ?? 0} quotes ·{" "}
          {(timeline.testDrives as unknown[] | undefined)?.length ?? 0} test drives
        </p>
      ) : null}

      <div className="dealer-lead-panel-ai space-y-3">
        <AILeadScore
          lead={{
            name: lead.name,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            type: lead.type,
            vehicleInterest: lead.vehicleInterest,
            aiScore: lead.aiScore,
          }}
        />
        <AIDealerAssistant leadName={lead.name} vehicleInterest={lead.vehicleInterest} />
      </div>

      <div className="dealer-lead-panel-actions">
        <Button size="sm" variant="outline" className="flex-1" asChild>
          <a href={`tel:${lead.phone}`}>
            <Phone className="h-4 w-4 mr-1" /> Call
          </a>
        </Button>
        <Button size="sm" className="flex-1" asChild>
          <a href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
          </a>
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" asChild>
          <Link to={`/dashboard/dealer/quotations/new?phone=${encodeURIComponent(lead.phone)}&leadId=${encodeURIComponent(lead.id)}`}>
            <FileText className="h-4 w-4 mr-1" /> Quote
          </Link>
        </Button>
      </div>

      <div className="dealer-lead-panel-section">
        <label className="dealer-lead-label">
          <User className="h-3.5 w-3.5" /> Assign to
        </label>
        <div className="flex gap-2">
          <select
            className="dealer-os-select flex-1"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Unassigned</option>
            {user?.id && (
              <option value={user.id}>Me (owner)</option>
            )}
            {team
              .filter((m) => m.userId)
              .map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.name} ({m.role})
                </option>
              ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => void onAssign()}>
            Save
          </Button>
        </div>
      </div>

      <div className="dealer-lead-panel-section">
        <label className="dealer-lead-label">
          <Calendar className="h-3.5 w-3.5" /> Callback reminder
        </label>
        <Input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
        <Button size="sm" className="mt-2 w-full" onClick={() => void scheduleReminder()} disabled={!reminderAt}>
          Schedule
        </Button>
      </div>

      <div className="dealer-lead-panel-section">
        <label className="dealer-lead-label">
          <StickyNote className="h-3.5 w-3.5" /> Notes
        </label>
        <Textarea
          placeholder="Call summary, objections, next step…"
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
        />
        <Button size="sm" className="mt-2 w-full" onClick={() => void saveNote()} disabled={!noteBody.trim()}>
          Add note
        </Button>
        <ul className="dealer-lead-notes mt-3">
          {notes.map((n) => (
            <li key={n.id} className="dealer-lead-note">
              <p className="text-sm">{n.body}</p>
              <time className="text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("en-IN")}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

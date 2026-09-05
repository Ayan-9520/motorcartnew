import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiErrorMessage } from "@/lib/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelTestDrive,
  completeTestDrive,
  confirmTestDrive,
  getTestDrive,
  markNoShow,
  rejectTestDrive,
  rescheduleTestDrive,
  updateTestDriveNotes,
} from "../services/test-drives.service";
import { formatTestDriveWhen, snapshotName, type TestDriveRecord } from "../types";
import { TestDriveStatusBadge } from "../components/TestDriveStatusBadge";
import { TestDriveWorkspaceShell, useTestDriveWorkspace } from "../components/TestDriveWorkspaceShell";
import { setPageMeta } from "@/utils/seo";

function toLocalInput(iso: string | null): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date(Date.now() + 48 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function DealerTestDriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { basePath } = useTestDriveWorkspace();
  const [row, setRow] = useState<TestDriveRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [slot, setSlot] = useState({ date: "", time: "10:00" });

  const reload = () => {
    if (!id) return;
    void getTestDrive(id)
      .then((data) => {
        setRow(data);
        setNotes(data.dealer_notes ?? "");
        setSlot(toLocalInput(data.confirmed_start_at ?? data.requested_start_at));
      })
      .catch(() => setRow(null));
  };

  useEffect(() => {
    setPageMeta({ title: "Test drive" });
    reload();
  }, [id]);

  if (!row) {
    return (
      <TestDriveWorkspaceShell title="Test drive" crumbs={[{ label: "Test drives", href: basePath }]}>
        <p className="text-muted-foreground">Loading…</p>
      </TestDriveWorkspaceShell>
    );
  }

  const run = async (fn: () => Promise<TestDriveRecord>, ok: string) => {
    try {
      setRow(await fn());
      toast.success(ok);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  const rescheduleIso = () => {
    const start = new Date(`${slot.date}T${slot.time}`);
    return start.toISOString();
  };

  const pending = row.status === "requested" || row.status === "rescheduled";
  const confirmed = row.status === "confirmed";

  return (
    <TestDriveWorkspaceShell
      title={snapshotName(row.metadata, "customer") || "Customer"}
      description="Confirm a requested time. This is not live calendar availability."
      crumbs={[
        { label: "Test drives", href: basePath },
        { label: snapshotName(row.metadata, "customer") || "Request" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          {pending ? (
            <Button className="rounded-xl" onClick={() => void run(() => confirmTestDrive(row.id), "Confirmed")}>
              Confirm
            </Button>
          ) : null}
          {pending || confirmed ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void run(() => rescheduleTestDrive(row.id, rescheduleIso()), "Rescheduled")}
            >
              Reschedule
            </Button>
          ) : null}
          {pending ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void run(() => rejectTestDrive(row.id, reason || undefined), "Rejected")}
            >
              Reject
            </Button>
          ) : null}
          {confirmed ? (
            <>
              <Button className="rounded-xl" onClick={() => void run(() => completeTestDrive(row.id), "Completed")}>
                Complete
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => void run(() => markNoShow(row.id), "No-show")}>
                No-show
              </Button>
            </>
          ) : null}
          {pending || confirmed ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void run(() => cancelTestDrive(row.id, reason || undefined), "Cancelled")}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      }
    >
      <article className="dealer-os-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {snapshotName(row.metadata, "vehicle") || snapshotName(row.metadata, "inventory") || "Vehicle"}
          </h2>
          <TestDriveStatusBadge status={row.status} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{snapshotName(row.metadata, "customer") || row.customer_user_id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Branch</dt>
            <dd>{snapshotName(row.metadata, "branch") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requested</dt>
            <dd>{formatTestDriveWhen(row.requested_start_at)} – {formatTestDriveWhen(row.requested_end_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Confirmed</dt>
            <dd>
              {row.confirmed_start_at
                ? `${formatTestDriveWhen(row.confirmed_start_at)} – ${formatTestDriveWhen(row.confirmed_end_at)}`
                : "Not confirmed"}
            </dd>
          </div>
        </dl>
        {row.customer_notes ? <p className="text-sm">Customer: {row.customer_notes}</p> : null}
        {row.lead_id ? <p className="text-xs text-muted-foreground">Linked lead {row.lead_id}</p> : null}
        {row.quotation_id ? <p className="text-xs text-muted-foreground">Linked quotation {row.quotation_id}</p> : null}

        {(pending || confirmed) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Reschedule date</Label>
              <Input type="date" className="mt-1" value={slot.date} onChange={(e) => setSlot((s) => ({ ...s, date: e.target.value }))} />
            </div>
            <div>
              <Label>Reschedule time</Label>
              <Input type="time" className="mt-1" value={slot.time} onChange={(e) => setSlot((s) => ({ ...s, time: e.target.value }))} />
            </div>
          </div>
        )}

        <div>
          <Label>Reject / cancel reason</Label>
          <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div>
          <Label>Dealer notes</Label>
          <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button
            variant="outline"
            className="mt-2 rounded-xl"
            onClick={() => void run(() => updateTestDriveNotes(row.id, notes), "Notes saved")}
          >
            Save notes
          </Button>
        </div>
        <Button variant="ghost" onClick={() => navigate(basePath)}>
          Back to requests
        </Button>
      </article>
    </TestDriveWorkspaceShell>
  );
}

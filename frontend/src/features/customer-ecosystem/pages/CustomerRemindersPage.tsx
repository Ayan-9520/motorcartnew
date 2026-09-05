import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { fetchReminders, mutateReminder } from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function CustomerRemindersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function refresh() {
    setRows(await fetchReminders());
  }

  useEffect(() => {
    setPageMeta({ title: "Reminders" });
    void refresh();
  }, []);

  return (
    <CustomerEcosystemPage title="Reminders" description="In-app lifecycle reminders from real dates only. No WhatsApp in this release.">
      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void mutateReminder({ title, dueAt }).then(() => {
            setTitle("");
            return refresh();
          });
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom reminder" />
        <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-3">
        {rows.length === 0 ? <p className="cos-empty">No reminders on file.</p> : null}
        {rows.map((r) => (
          <li key={String(r.id)} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{String(r.title)}</p>
            <p className="text-muted-foreground">
              {String(r.kind)} · {String(r.bucket)} · {String(r.dueAtEffective ?? r.dueAt)}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void mutateReminder({ action: "complete", id: r.id }).then(refresh)}>
                Complete
              </Button>
              <Button size="sm" variant="outline" onClick={() => void mutateReminder({ action: "dismiss", id: r.id }).then(refresh)}>
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </CustomerEcosystemPage>
  );
}

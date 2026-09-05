import { useEffect, useState } from "react";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { fetchCustomerActivity } from "../services/superapp.service";
import { setPageMeta } from "@/utils/seo";

export function CustomerActivityPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    setPageMeta({ title: "Activity" });
    void fetchCustomerActivity().then(setRows);
  }, []);

  return (
    <CustomerEcosystemPage title="Activity" description="Timeline of real events only. Empty until you use garage, enquiries, quotations, or sell.">
      <ul className="space-y-3">
        {rows.length === 0 ? <p className="cos-empty">No activity yet.</p> : null}
        {rows.map((r, i) => (
          <li key={`${r.type}-${r.at}-${i}`} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{String(r.title)}</p>
            <p className="text-muted-foreground">
              {String(r.type)} · {String(r.at)}
            </p>
          </li>
        ))}
      </ul>
    </CustomerEcosystemPage>
  );
}

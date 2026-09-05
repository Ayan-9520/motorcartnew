import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { CustomerEcosystemPage } from "@/features/customer-ecosystem/components/CustomerEcosystemPage";
import { listTestDrives } from "../services/test-drives.service";
import { formatTestDriveWhen, snapshotName, type TestDriveRecord } from "../types";
import { TestDriveStatusBadge } from "../components/TestDriveStatusBadge";
import { setPageMeta } from "@/utils/seo";

export function CustomerTestDrivesPage() {
  const [rows, setRows] = useState<TestDriveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: "My Test Drives" });
    void listTestDrives()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CustomerEcosystemPage
      title="My Test Drives"
      description="Requests you submitted. Empty until you request a test drive on a listing."
    >
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="cos-empty">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3">No test-drive requests yet. Open a vehicle listing to request one.</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((row) => (
          <Link
            key={row.id}
            to={`/dashboard/customer/test-drives/${row.id}`}
            className="cos-form-card block hover:border-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {snapshotName(row.metadata, "vehicle") ||
                    snapshotName(row.metadata, "inventory") ||
                    "Vehicle"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {snapshotName(row.metadata, "dealer") || "Dealer"}
                  {snapshotName(row.metadata, "branch") ? ` · ${snapshotName(row.metadata, "branch")}` : ""}
                </p>
              </div>
              <TestDriveStatusBadge status={row.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Requested {formatTestDriveWhen(row.requested_start_at)}
              {row.confirmed_start_at ? ` · Confirmed ${formatTestDriveWhen(row.confirmed_start_at)}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </CustomerEcosystemPage>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { listTestDrives } from "../services/test-drives.service";
import { formatTestDriveWhen, snapshotName, type TestDriveRecord } from "../types";
import { TestDriveStatusBadge } from "../components/TestDriveStatusBadge";
import { TestDriveWorkspaceShell, useTestDriveWorkspace } from "../components/TestDriveWorkspaceShell";
import { setPageMeta } from "@/utils/seo";

export function DealerTestDrivesPage() {
  const { basePath } = useTestDriveWorkspace();
  const [rows, setRows] = useState<TestDriveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: "Test drive requests" });
    void listTestDrives()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TestDriveWorkspaceShell
      title="Test drive requests"
      description="Customer requests for your showroom. Times are requested, not live availability."
      crumbs={[{ label: "Test drives" }]}
    >
      {loading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="dealer-os-card py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">No test-drive requests yet.</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((row) => (
          <Link key={row.id} to={`${basePath}/${row.id}`} className="dealer-os-card block hover:border-primary/40">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{snapshotName(row.metadata, "customer") || "Customer"}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshotName(row.metadata, "vehicle") ||
                    snapshotName(row.metadata, "inventory") ||
                    "Vehicle"}
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
    </TestDriveWorkspaceShell>
  );
}

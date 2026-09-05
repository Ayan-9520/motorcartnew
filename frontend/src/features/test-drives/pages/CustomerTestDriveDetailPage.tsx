import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiErrorMessage } from "@/lib/api/axios";
import { Button } from "@/components/ui/button";
import { CustomerEcosystemPage } from "@/features/customer-ecosystem/components/CustomerEcosystemPage";
import { cancelTestDrive, getTestDrive } from "../services/test-drives.service";
import { formatTestDriveWhen, snapshotName, type TestDriveRecord } from "../types";
import { TestDriveStatusBadge } from "../components/TestDriveStatusBadge";
import { setPageMeta } from "@/utils/seo";

export function CustomerTestDriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<TestDriveRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Test drive" });
    if (!id) return;
    void getTestDrive(id)
      .then(setRow)
      .catch(() => setError("Test drive not found."));
  }, [id]);

  if (error) {
    return (
      <CustomerEcosystemPage title="Test drive">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/dashboard/customer/test-drives">Back</Link>
        </Button>
      </CustomerEcosystemPage>
    );
  }

  if (!row) {
    return (
      <CustomerEcosystemPage title="Test drive">
        <p className="text-muted-foreground">Loading…</p>
      </CustomerEcosystemPage>
    );
  }

  const vehicle = snapshotName(row.metadata, "vehicle") || snapshotName(row.metadata, "inventory") || "Vehicle";
  const dealer = snapshotName(row.metadata, "dealer") || "Dealer";
  const branch = snapshotName(row.metadata, "branch");
  const canCancel = row.status === "requested" || row.status === "rescheduled" || row.status === "confirmed";

  const onCancel = async () => {
    try {
      setRow(await cancelTestDrive(row.id, "Cancelled by customer"));
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <CustomerEcosystemPage
      title={vehicle}
      description={`${dealer}${branch ? ` · ${branch}` : ""}`}
      actions={
        canCancel ? (
          <Button variant="outline" className="rounded-xl" onClick={() => void onCancel()}>
            Cancel request
          </Button>
        ) : null
      }
    >
      <article className="cos-form-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Test-drive request</p>
          <TestDriveStatusBadge status={row.status} />
        </div>
        {row.status === "requested" ? (
          <p className="text-sm text-muted-foreground">
            Request submitted. The dealer has not confirmed a slot yet.
          </p>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Dealer</dt>
            <dd className="font-medium">{dealer}</dd>
          </div>
          {branch ? (
            <div>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="font-medium">{branch}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd className="font-medium">{vehicle}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Requested</dt>
            <dd>{formatTestDriveWhen(row.requested_start_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Confirmed</dt>
            <dd>{formatTestDriveWhen(row.confirmed_start_at)}</dd>
          </div>
        </dl>
        {row.customer_notes ? <p className="text-sm">{row.customer_notes}</p> : null}
        {row.dealer_notes ? (
          <p className="text-sm text-muted-foreground">Dealer note: {row.dealer_notes}</p>
        ) : null}
        {row.rejection_reason ? (
          <p className="text-sm text-muted-foreground">Declined: {row.rejection_reason}</p>
        ) : null}
        {row.cancellation_reason ? (
          <p className="text-sm text-muted-foreground">Cancelled: {row.cancellation_reason}</p>
        ) : null}
      </article>
    </CustomerEcosystemPage>
  );
}

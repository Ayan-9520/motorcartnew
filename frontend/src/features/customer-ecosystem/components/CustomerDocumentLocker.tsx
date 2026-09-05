import { FileText, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/shared/notifications/app-toast";
import type { VehicleDocument } from "../types";

const DOC_LABELS: Record<VehicleDocument["docType"], string> = {
  rc: "RC",
  insurance: "Insurance",
  puc: "PUC",
  loan: "Loan",
  warranty: "Warranty",
  invoice: "Invoice",
  other: "Other",
};

type CustomerDocumentLockerProps = {
  documents: VehicleDocument[];
  showUploadActions?: boolean;
};

export function CustomerDocumentLocker({ documents, showUploadActions = true }: CustomerDocumentLockerProps) {
  return (
    <div className="space-y-4">
      {showUploadActions ? (
        <div className="cos-doc-upload">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            type="button"
            onClick={() => toast("Document scan is not available yet.")}
          >
            <ScanLine className="h-4 w-4" />
            Scan / OCR
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            type="button"
            onClick={() => toast("QR scan is not available yet.")}
          >
            <QrCode className="h-4 w-4" />
            QR scan
          </Button>
          <Button
            className="rounded-xl"
            type="button"
            onClick={() => toast("Document upload is not available yet.")}
          >
            Upload document
          </Button>
        </div>
      ) : null}
      {documents.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <article
              key={doc.id}
              className={cn(
                "cos-doc-card",
                doc.daysUntilExpiry != null && doc.daysUntilExpiry <= 30 && "cos-doc-card--expiring"
              )}
            >
            <div className="cos-doc-card__icon">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {DOC_LABELS[doc.docType]}
                </Badge>
                {doc.verified ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 truncate font-medium">{doc.title}</h3>
              {doc.documentNumber ? (
                <p className="truncate text-xs text-muted-foreground">{doc.documentNumber}</p>
              ) : null}
              {doc.expiresAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires {new Date(doc.expiresAt).toLocaleDateString("en-IN")}
                  {doc.daysUntilExpiry != null ? ` · ${doc.daysUntilExpiry}d left` : ""}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No documents on file yet.
        </p>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DealerConsoleShell } from "../components/DealerConsoleShell";
import { useDealer } from "../hooks/useDealer";
import {
  fetchDealerDocuments,
  fetchDealerEnterprise,
  updateDealerProfile,
  uploadDealerDocument,
  type DealerVerificationStatus,
} from "../services/dealer-enterprise.service";
import { uploadFile } from "@/services/storage.service";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";

const DOC_TYPES = [
  { id: "gst", label: "GST certificate" },
  { id: "pan", label: "PAN card" },
  { id: "trade_license", label: "Trade license" },
  { id: "address_proof", label: "Address proof" },
];

const STATUS_LABELS: Record<DealerVerificationStatus, string> = {
  pending: "Pending documents",
  documents_submitted: "Documents submitted",
  under_review: "Under review",
  verified: "Verified dealer",
  rejected: "Rejected — re-upload required",
};

export function DealerVerificationPage() {
  const { dealer, loading: dealerLoading } = useDealer();
  const [gst, setGst] = useState("");
  const [pan, setPan] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<DealerVerificationStatus>("pending");
  const [docs, setDocs] = useState<{ doc_type: string; file_name: string; status: string }[]>([]);

  const load = useCallback(async () => {
    if (!dealer) return;
    const ent = await fetchDealerEnterprise(dealer.id);
    if (ent) {
      setGst(ent.gstNumber ?? "");
      setPan(ent.panNumber ?? "");
      setVerificationStatus(ent.verificationStatus);
    }
    setDocs(await fetchDealerDocuments(dealer.id));
  }, [dealer]);

  useEffect(() => {
    setPageMeta({ title: "Dealer verification" });
    void load();
  }, [load]);

  const saveIds = async () => {
    if (!dealer) return;
    const { error } = await updateDealerProfile(dealer.id, {
      gst_number: gst,
      pan_number: pan,
    });
    if (error) toast.error(error.message);
    else toast.success("Business IDs saved");
  };

  const onFile = async (docType: string, file: File) => {
    if (!dealer) return;
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const { publicUrl } = await uploadFile(
        "dealer-documents",
        `${dealer.id}/${docType}-${Date.now()}.${ext}`,
        file
      );
      await uploadDealerDocument({
        dealerId: dealer.id,
        docType,
        fileUrl: publicUrl,
        fileName: file.name,
      });
      toast.success(`${docType} uploaded`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (dealerLoading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <DealerConsoleShell
      title="Dealer verification"
      description="KYC, GST, PAN and compliance documents for Motorcart verified badge."
      crumbs={[{ label: "Verification" }]}
    >
      <div className="dealer-os-grid-2">
        <section className="dealer-os-card">
          <div className="dealer-os-card-head">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Verification status</h2>
              <p className="text-sm text-muted-foreground">{STATUS_LABELS[verificationStatus]}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className="dealer-os-label">GST number</label>
              <Input value={gst} onChange={(e) => setGst(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="dealer-os-label">PAN</label>
              <Input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="ABCDE1234F" />
            </div>
            <Button onClick={() => void saveIds()}>Save business IDs</Button>
          </div>
        </section>

        <section className="dealer-os-card">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Documents
          </h2>
          <ul className="mt-4 space-y-3">
            {DOC_TYPES.map((d) => {
              const uploaded = docs.find((x) => x.doc_type === d.id);
              return (
                <li key={d.id} className="dealer-doc-row">
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {uploaded ? `${uploaded.file_name} · ${uploaded.status}` : "Not uploaded"}
                  </span>
                  <label className="dealer-doc-upload">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onFile(d.id, f);
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </DealerConsoleShell>
  );
}

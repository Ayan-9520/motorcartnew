import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, FileUp, Loader2, Phone, X } from "lucide-react";
import toast from "react-hot-toast";
import { setPageMeta } from "@/utils/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { InsuranceSubpageShell } from "../components/InsuranceSubpageShell";
import { InsuranceVehicleToggle } from "../components/InsuranceVehicleToggle";
import { useInsuranceApplications, useMyClaimRequests } from "../hooks/useInsuranceApplications";
import { parseInsuranceVehicle, vehicleTypeLabel } from "../lib/insurance-routes";
import { MOTOR_INSURERS } from "../lib/insurance-engine";
import { submitClaimRequest, uploadInsuranceDocument, type InsuranceDocumentRef } from "../services/insurance.service";
import type { InsuranceVehicleType } from "../types";

const INCIDENTS: { id: string; label: string; docs: string[] }[] = [
  { id: "accident", label: "Accident / collision", docs: ["Damage photos", "Driving licence", "RC", "Policy copy"] },
  { id: "theft", label: "Theft of vehicle", docs: ["FIR copy", "RC", "All original keys", "Policy copy", "Non-traceable report (police)"] },
  { id: "fire", label: "Fire", docs: ["Damage photos", "Fire brigade report", "RC", "Policy copy"] },
  { id: "flood", label: "Flood / water logging", docs: ["Photos showing water level", "RC", "Policy copy"] },
  { id: "natural_calamity", label: "Storm, landslide, earthquake", docs: ["Damage photos", "RC", "Policy copy"] },
  { id: "vandalism", label: "Riot / vandalism / malicious act", docs: ["Damage photos", "FIR copy", "RC"] },
  { id: "glass", label: "Windshield / glass only", docs: ["Glass damage photos", "RC", "Policy copy"] },
  { id: "third_party", label: "Third-party injury / property damage", docs: ["FIR copy", "Driving licence", "RC", "Policy copy"] },
];

const STEPS = [
  { title: "Intimate immediately", body: "Inform the insurer within 24–48 hours. Don't move the vehicle for major damage before photos; for theft, file an FIR first." },
  { title: "Claim registered", body: "Insurer issues a claim number. Choose cashless (network garage) or reimbursement (any garage)." },
  { title: "Survey", body: "A surveyor (or video survey) inspects the damage and approves repair estimates. Claims above ₹50,000 need a licensed surveyor." },
  { title: "Repair & settlement", body: "Cashless: insurer pays the garage directly, you pay only deductibles/depreciation. Reimbursement: pay the garage, submit bills, insurer refunds." },
];

const L = "text-xs font-semibold text-muted-foreground";

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function InsuranceClaimsPage() {
  const [params, setParams] = useSearchParams();
  const vehicleType = parseInsuranceVehicle(params.get("type"));
  const { user } = useAuth();
  const location = useLocation();
  const { applications } = useInsuranceApplications();
  const { claims, loading, refetch } = useMyClaimRequests();

  const [form, setForm] = useState({
    applicationId: "",
    insurerName: "",
    policyNumber: "",
    vehicleReg: "",
    incidentType: "accident",
    incidentAt: "",
    location: "",
    description: "",
    claimMode: "cashless",
    garage: "",
    firNumber: "",
    contactPhone: (user?.phone ?? "").replace(/\D/g, "").slice(-10),
  });
  const [docs, setDocs] = useState<InsuranceDocumentRef[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: `Motor insurance claim — ${vehicleTypeLabel(vehicleType)} | Motorcart`,
      description: "Intimate a car or bike insurance claim, see required documents and track survey & settlement.",
    });
  }, [vehicleType]);

  const incident = INCIDENTS.find((i) => i.id === form.incidentType) ?? INCIDENTS[0];
  const issued = applications.filter((a) => a.status === "issued");
  const helpline = useMemo(
    () => MOTOR_INSURERS.find((i) => i.shortName === form.insurerName || i.name === form.insurerName),
    [form.insurerName],
  );

  const pickPolicy = (id: string) => {
    const app = issued.find((a) => a.id === id);
    if (!app) {
      setForm((f) => ({ ...f, applicationId: "" }));
      return;
    }
    const ins = MOTOR_INSURERS.find((i) => i.slug === app.metadata.insurerSlug);
    setForm((f) => ({
      ...f,
      applicationId: id,
      insurerName: ins?.shortName ?? app.provider ?? "",
      policyNumber: app.metadata.policyNumber ?? "",
      vehicleReg: app.metadata.vehicle?.registrationNumber ?? f.vehicleReg,
    }));
  };

  const onUpload = async (label: string, file?: File) => {
    if (!file) return;
    setUploading(label);
    try {
      const ref = await uploadInsuranceDocument(file, label);
      setDocs((d) => [...d.filter((x) => x.label !== label), ref]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    const r = await submitClaimRequest({
      ...form,
      vehicleType,
      incidentAt: form.incidentAt ? new Date(form.incidentAt).toISOString() : "",
      applicationId: form.applicationId || undefined,
      documents: docs,
    });
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Claim intimated — our claims desk will call you");
    setForm((f) => ({ ...f, description: "", location: "", firNumber: "", garage: "", incidentAt: "" }));
    setDocs([]);
    void refetch();
  };

  return (
    <InsuranceSubpageShell
      title="Motor insurance claims"
      subtitle="Intimate a claim, know exactly which documents you need, and track survey to settlement."
      vehicleType={vehicleType}
    >
      <InsuranceVehicleToggle
        value={vehicleType}
        onChange={(t: InsuranceVehicleType) => setParams({ type: t }, { replace: true })}
        className="mb-6"
      />

      <ol className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="ins-feature-card">
            <p className="text-xs font-bold text-emerald-600">Step {i + 1}</p>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-5">
        <section className="ins-panel min-w-0 space-y-4 lg:col-span-3">
          <h2 className="text-sm font-bold">Intimate a claim</h2>
          {!user ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Sign in to intimate and track your claim. In an emergency, call your insurer's helpline (listed alongside) right away.</p>
              <Button className="rounded-xl" asChild>
                <Link to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>Sign in to continue</Link>
              </Button>
            </div>
          ) : (
            <>
              {issued.length > 0 && (
                <div>
                  <Label className={L} htmlFor="cl-pol">Policy bought on MotorCart</Label>
                  <select id="cl-pol" className="ins-select mt-1" value={form.applicationId} onChange={(e) => pickPolicy(e.target.value)}>
                    <option value="">Other policy (enter below)</option>
                    {issued.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.metadata.policyNumber} · {a.provider} · {a.metadata.vehicle?.registrationNumber ?? a.metadata.vehicle?.model}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className={L} htmlFor="cl-ins">Insurer</Label>
                  <select id="cl-ins" className="ins-select mt-1" value={form.insurerName} onChange={(e) => setForm({ ...form, insurerName: e.target.value })}>
                    <option value="">Select</option>
                    {MOTOR_INSURERS.map((i) => (
                      <option key={i.slug} value={i.shortName}>{i.shortName}</option>
                    ))}
                    <option value="Other insurer">Other insurer</option>
                  </select>
                </div>
                <div>
                  <Label className={L} htmlFor="cl-pno">Policy no.</Label>
                  <Input id="cl-pno" className="mt-1" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
                </div>
                <div>
                  <Label className={L} htmlFor="cl-reg">Vehicle reg. no.</Label>
                  <Input id="cl-reg" className="mt-1 uppercase" value={form.vehicleReg} onChange={(e) => setForm({ ...form, vehicleReg: e.target.value.toUpperCase() })} placeholder="DL01AB1234" />
                </div>
                <div>
                  <Label className={L} htmlFor="cl-type">What happened</Label>
                  <select id="cl-type" className="ins-select mt-1" value={form.incidentType} onChange={(e) => setForm({ ...form, incidentType: e.target.value })}>
                    {INCIDENTS.map((i) => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={L} htmlFor="cl-at">Date & time</Label>
                  <Input id="cl-at" type="datetime-local" max={nowLocal()} className="mt-1" value={form.incidentAt} onChange={(e) => setForm({ ...form, incidentAt: e.target.value })} />
                </div>
                <div>
                  <Label className={L} htmlFor="cl-ph">Contact mobile</Label>
                  <Input id="cl-ph" inputMode="numeric" maxLength={10} className="mt-1" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div className="sm:col-span-3">
                  <Label className={L} htmlFor="cl-loc">Location</Label>
                  <Input id="cl-loc" className="mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Road / area, city" />
                </div>
                <div className="sm:col-span-3">
                  <Label className={L} htmlFor="cl-desc">Describe the incident & damage</Label>
                  <textarea
                    id="cl-desc"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label className={L} htmlFor="cl-mode">Claim type</Label>
                  <select id="cl-mode" className="ins-select mt-1" value={form.claimMode} onChange={(e) => setForm({ ...form, claimMode: e.target.value })}>
                    <option value="cashless">Cashless (network garage)</option>
                    <option value="reimbursement">Reimbursement</option>
                  </select>
                </div>
                <div>
                  <Label className={L} htmlFor="cl-gar">Preferred garage</Label>
                  <Input id="cl-gar" className="mt-1" value={form.garage} onChange={(e) => setForm({ ...form, garage: e.target.value })} placeholder="Name & area" />
                </div>
                <div>
                  <Label className={L} htmlFor="cl-fir">FIR no.{form.incidentType === "theft" ? " (required)" : ""}</Label>
                  <Input id="cl-fir" className="mt-1" value={form.firNumber} onChange={(e) => setForm({ ...form, firNumber: e.target.value })} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Documents for {incident.label.toLowerCase()}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {incident.docs.map((label) => {
                    const doc = docs.find((d) => d.label === label);
                    return (
                      <li key={label} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{label}</span>
                        {doc ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <button type="button" aria-label={`Remove ${label}`} onClick={() => setDocs((d) => d.filter((x) => x.label !== label))}>
                              <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </span>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary">
                            {uploading === label ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                            Upload
                            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading != null} onChange={(e) => void onUpload(label, e.target.files?.[0])} />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Button className="w-full rounded-xl" disabled={submitting} onClick={() => void submit()}>
                {submitting ? "Submitting…" : "Intimate claim"}
              </Button>
              {helpline && (
                <p className="text-center text-xs text-muted-foreground">
                  Also call {helpline.shortName} claims: <a className="font-semibold text-primary" href={`tel:${helpline.claimHelpline.replace(/\s/g, "")}`}>{helpline.claimHelpline}</a>
                </p>
              )}
            </>
          )}
        </section>

        <aside className="min-w-0 space-y-4 lg:col-span-2">
          <section className="ins-panel space-y-3">
            <h2 className="text-sm font-bold">My claims</h2>
            {!user ? (
              <p className="text-sm text-muted-foreground">Sign in to track claims.</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No claims intimated yet.</p>
            ) : (
              <ul className="space-y-2">
                {claims.map((c) => (
                  <li key={c.id} className="rounded-xl border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{c.vehicleReg}</strong>
                      <Badge variant="outline">{c.statusLabel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.insurerName} · {INCIDENTS.find((i) => i.id === c.incidentType)?.label ?? c.incidentType} ·{" "}
                      {new Date(c.incidentAt).toLocaleDateString("en-IN")}
                    </p>
                    {c.claimNumber && <p className="text-xs">Claim no. {c.claimNumber}</p>}
                    {c.surveyAt && <p className="text-xs">Survey: {new Date(c.surveyAt).toLocaleString("en-IN")}</p>}
                    {c.approvedAmount != null && <p className="text-xs font-semibold text-emerald-600">Approved {formatCurrency(c.approvedAmount)}</p>}
                    {c.notes.length > 0 && c.notes[c.notes.length - 1]?.note && (
                      <p className="mt-1 text-xs text-muted-foreground">“{c.notes[c.notes.length - 1]!.note}”</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="ins-panel space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Phone className="h-4 w-4 text-primary" /> Insurer claim helplines
            </h2>
            <ul className="space-y-1 text-sm">
              {MOTOR_INSURERS.map((i) => (
                <li key={i.slug} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{i.shortName}</span>
                  <a className="font-medium tabular-nums" href={`tel:${i.claimHelpline.replace(/\s/g, "")}`}>{i.claimHelpline}</a>
                </li>
              ))}
            </ul>
          </section>
          <section className="ins-panel space-y-1 text-xs text-muted-foreground">
            <h2 className="mb-1 text-sm font-bold text-foreground">What is not paid</h2>
            <p>• Compulsory deductible: ₹1,000 (≤1500cc car), ₹2,000 (&gt;1500cc), ₹100 (bike) + any voluntary deductible.</p>
            <p>• Depreciation on parts (rubber/plastic 50%, glass nil, metal by age) — unless you have zero dep.</p>
            <p>• Drunk / unlicensed driving, mechanical breakdown, consequential engine damage without engine protect.</p>
          </section>
        </aside>
      </div>
    </InsuranceSubpageShell>
  );
}

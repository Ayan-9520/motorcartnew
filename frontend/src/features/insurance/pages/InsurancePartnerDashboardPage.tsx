import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FinanceDashboardShell } from "@/features/finance/components/FinanceDashboardShell";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import {
  INSURANCE_APPLICATION_STATUSES,
  INSURANCE_CLAIM_STATUSES,
  applicationStatusLabel,
  claimStatusLabel,
} from "../lib/insurance-engine";
import {
  fetchDeskClaimRequests,
  fetchDeskMotorApplications,
  updateClaimRequest,
  updateMotorApplication,
  type InsuranceClaimRequestRow,
  type MotorInsuranceApplication,
} from "../services/insurance.service";

type Quote = { id: string; quoteKind: string; premium?: number | string | null };
type Policy = { id: string; policyNumber: string; status: string };
type Claim = { id: string; status: string; description: string };

type Tab = "applications" | "claims" | "partner";

function ApplicationRow({ app, onSaved }: { app: MotorInsuranceApplication; onSaved: () => void }) {
  const m = app.metadata;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState("");
  const [finalPremium, setFinalPremium] = useState(m.finalPremium ? String(m.finalPremium) : "");
  const [paymentLink, setPaymentLink] = useState(m.paymentLink ?? "");
  const [inspectionLink, setInspectionLink] = useState(m.inspectionLink ?? "");
  const [policyNumber, setPolicyNumber] = useState(m.policyNumber ?? "");
  const [policyStart, setPolicyStart] = useState(m.policyStart?.slice(0, 10) ?? "");
  const [policyEnd, setPolicyEnd] = useState(m.policyEnd?.slice(0, 10) ?? "");
  const [policyDocumentUrl, setPolicyDocumentUrl] = useState(m.policyDocumentUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const r = await updateMotorApplication(app.id, {
      status,
      note: note || undefined,
      finalPremium: finalPremium ? Number(finalPremium) : undefined,
      paymentLink,
      inspectionLink,
      policyNumber: policyNumber || undefined,
      policyStart: policyStart || undefined,
      policyEnd: policyEnd || undefined,
      policyDocumentUrl,
    });
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Application updated — customer notified");
      setNote("");
      onSaved();
    }
  };

  return (
    <li className="ins-policy-card space-y-2 text-sm">
      <button type="button" className="flex w-full flex-wrap items-start justify-between gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <strong>{m.owner?.fullName ?? "Customer"}</strong> · {m.vehicle?.make} {m.vehicle?.model}
          {m.vehicle?.registrationNumber ? ` · ${m.vehicle.registrationNumber}` : ""}
          <span className="block text-xs text-muted-foreground">
            {m.reference} · {m.insurerName} · {m.planLabel} · {m.scenario} · {new Date(app.createdAt).toLocaleString("en-IN")}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-bold text-primary">{app.premium != null ? formatCurrency(app.premium) : "—"}</span>
          <Badge variant="outline">{applicationStatusLabel(app.status)}</Badge>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t pt-3">
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <p><span className="text-muted-foreground">Phone:</span> {m.owner?.phone} {m.owner?.email ? `· ${m.owner.email}` : ""}</p>
            <p><span className="text-muted-foreground">Address:</span> {m.owner?.address} {m.owner?.pincode}</p>
            <p><span className="text-muted-foreground">Chassis:</span> {m.vehicle?.chassisNumber ?? "—"}</p>
            <p><span className="text-muted-foreground">City / fuel / capacity:</span> {m.quoteInput?.city} · {m.quoteInput?.fuel} · {m.quoteInput?.capacity}</p>
            <p><span className="text-muted-foreground">Ex-showroom / IDV:</span> {formatCurrency(m.quoteInput?.exShowroom ?? 0)} / {formatCurrency(m.quote?.idv ?? 0)}</p>
            <p><span className="text-muted-foreground">NCB:</span> {m.assessment?.ncbPercent ?? 0}% {m.assessment?.inspectionRequired ? "· inspection required" : ""}</p>
            <p><span className="text-muted-foreground">Previous policy:</span> {m.previousPolicy?.insurer ?? "—"} {m.previousPolicy?.policyNumber ?? ""} {m.previousPolicy?.expiryDate ?? ""}</p>
            <p><span className="text-muted-foreground">Nominee:</span> {m.owner?.nomineeName ?? "—"}</p>
            <p><span className="text-muted-foreground">Add-ons:</span> {m.quote?.addons.map((a) => a.label).join(", ") || "—"}</p>
          </div>
          {m.documents && m.documents.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs">
              {m.documents.map((d) => (
                <li key={d.url}>
                  <a className="rounded-lg border px-2 py-1 font-medium text-primary" href={d.url} target="_blank" rel="noopener noreferrer">{d.label}</a>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="ins-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              {INSURANCE_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>{applicationStatusLabel(s)}</option>
              ))}
            </select>
            <Input placeholder="Final premium ₹ (from insurer)" inputMode="numeric" value={finalPremium} onChange={(e) => setFinalPremium(e.target.value.replace(/\D/g, ""))} />
            <Input placeholder="Insurer payment link (https://)" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} />
            <Input placeholder="Inspection link (https://)" value={inspectionLink} onChange={(e) => setInspectionLink(e.target.value)} />
            {status === "issued" && (
              <>
                <Input placeholder="Policy number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
                <Input placeholder="Policy PDF URL" value={policyDocumentUrl} onChange={(e) => setPolicyDocumentUrl(e.target.value)} />
                <label className="text-xs text-muted-foreground">Start<Input type="date" value={policyStart} onChange={(e) => setPolicyStart(e.target.value)} /></label>
                <label className="text-xs text-muted-foreground">End<Input type="date" value={policyEnd} onChange={(e) => setPolicyEnd(e.target.value)} /></label>
              </>
            )}
            <Input className="sm:col-span-3" placeholder="Note to customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button size="sm" className="rounded-lg" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save & notify customer"}
          </Button>
        </div>
      )}
    </li>
  );
}

function ClaimRow({ claim, onSaved }: { claim: InsuranceClaimRequestRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [claimNumber, setClaimNumber] = useState(claim.claimNumber ?? "");
  const [surveyAt, setSurveyAt] = useState(claim.surveyAt ? claim.surveyAt.slice(0, 16) : "");
  const [approvedAmount, setApprovedAmount] = useState(claim.approvedAmount != null ? String(claim.approvedAmount) : "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const r = await updateClaimRequest(claim.id, {
      status,
      claimNumber,
      surveyAt: surveyAt ? new Date(surveyAt).toISOString() : undefined,
      approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
      note: note || undefined,
    });
    setSaving(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Claim updated — customer notified");
      setNote("");
      onSaved();
    }
  };

  return (
    <li className="ins-policy-card space-y-2 text-sm">
      <button type="button" className="flex w-full flex-wrap items-start justify-between gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <strong>{claim.vehicleReg}</strong> · {claim.insurerName} · {claim.incidentType.replace(/_/g, " ")}
          <span className="block text-xs text-muted-foreground">
            Policy {claim.policyNumber} · {claim.claimMode} · {new Date(claim.incidentAt).toLocaleString("en-IN")} · {claim.contactPhone}
          </span>
        </span>
        <Badge variant="outline">{claimStatusLabel(claim.status)}</Badge>
      </button>
      {open && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs"><span className="text-muted-foreground">Location:</span> {claim.location}</p>
          <p className="text-xs">{claim.description}</p>
          <p className="text-xs text-muted-foreground">Garage: {claim.garage ?? "—"} · FIR: {claim.firNumber ?? "—"}</p>
          {claim.documents.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs">
              {claim.documents.map((d) => (
                <li key={d.url}>
                  <a className="rounded-lg border px-2 py-1 font-medium text-primary" href={d.url} target="_blank" rel="noopener noreferrer">{d.label}</a>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="ins-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Claim status">
              {INSURANCE_CLAIM_STATUSES.map((s) => (
                <option key={s} value={s}>{claimStatusLabel(s)}</option>
              ))}
            </select>
            <Input placeholder="Insurer claim number" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} />
            <label className="text-xs text-muted-foreground">Survey at<Input type="datetime-local" value={surveyAt} onChange={(e) => setSurveyAt(e.target.value)} /></label>
            <label className="text-xs text-muted-foreground">Approved amount ₹<Input inputMode="numeric" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value.replace(/\D/g, ""))} /></label>
            <Input className="sm:col-span-2" placeholder="Note to customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button size="sm" className="rounded-lg" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save & notify customer"}
          </Button>
        </div>
      )}
    </li>
  );
}

export function InsurancePartnerDashboardPage() {
  const [tab, setTab] = useState<Tab>("applications");
  const [statusFilter, setStatusFilter] = useState("");
  const [apps, setApps] = useState<MotorInsuranceApplication[]>([]);
  const [deskClaims, setDeskClaims] = useState<InsuranceClaimRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  const loadDesk = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([fetchDeskMotorApplications(), fetchDeskClaimRequests()]);
      setApps(a);
      setDeskClaims(c);
    } catch {
      toast.error("Could not load insurance desk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPageMeta({ title: "Insurance desk — MotorCart" });
    void loadDesk();
    void Promise.all([
      api.get<{ data: Quote[] }>("/api/insurance/quotes").then((r) => setQuotes(r.data.data ?? [])),
      api.get<{ data: Policy[] }>("/api/insurance/policies").then((r) => setPolicies(r.data.data ?? [])),
      api.get<{ data: Claim[] }>("/api/insurance/claims").then((r) => setClaims(r.data.data ?? [])),
    ]).catch(() => {
      setQuotes([]);
      setPolicies([]);
      setClaims([]);
    });
  }, [loadDesk]);

  const openApps = apps.filter((a) => !["issued", "rejected", "cancelled"].includes(a.status)).length;
  const openClaims = deskClaims.filter((c) => !["settled", "rejected", "closed"].includes(c.status)).length;
  const issuedPremium = apps.filter((a) => a.status === "issued").reduce((s, a) => s + (a.premium ?? 0), 0);
  const visibleApps = statusFilter ? apps.filter((a) => a.status === statusFilter) : apps;

  return (
    <FinanceDashboardShell variant="lender" title="Insurance desk" subtitle="Motor applications, claim intimations and insurer partner feed">
      <ul className="mb-6 grid gap-3 sm:grid-cols-3">
        <li className="ins-policy-card"><p className="text-xs text-muted-foreground">Open applications</p><p className="text-2xl font-bold">{openApps}</p></li>
        <li className="ins-policy-card"><p className="text-xs text-muted-foreground">Open claims</p><p className="text-2xl font-bold">{openClaims}</p></li>
        <li className="ins-policy-card"><p className="text-xs text-muted-foreground">Premium issued</p><p className="text-2xl font-bold">{formatCurrency(issuedPremium)}</p></li>
      </ul>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["applications", `Applications (${apps.length})`],
            ["claims", `Claims (${deskClaims.length})`],
            ["partner", "Insurer partner feed"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("ins-plan-pill text-sm font-semibold", tab === id && "ins-plan-pill--active")}>
            {label}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => void loadDesk()}>Refresh</Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && tab === "applications" && (
        <section className="space-y-3">
          <select className="ins-select max-w-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter status">
            <option value="">All statuses</option>
            {INSURANCE_APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>{applicationStatusLabel(s)}</option>
            ))}
          </select>
          {visibleApps.length === 0 ? (
            <p className="text-muted-foreground">No applications.</p>
          ) : (
            <ul className="space-y-3">
              {visibleApps.map((a) => (
                <ApplicationRow key={`${a.id}-${a.updatedAt}`} app={a} onSaved={() => void loadDesk()} />
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "claims" && (
        deskClaims.length === 0 ? (
          <p className="text-muted-foreground">No claim intimations.</p>
        ) : (
          <ul className="space-y-3">
            {deskClaims.map((c) => (
              <ClaimRow key={`${c.id}-${c.updatedAt}`} claim={c} onSaved={() => void loadDesk()} />
            ))}
          </ul>
        )
      )}

      {tab === "partner" && (
        <>
          <section className="fin-section">
            <h2 className="fin-section__title">Partner quotes</h2>
            {!quotes.length ? <p className="text-muted-foreground">No partner quotes yet.</p> : (
              <ul className="space-y-2 text-sm">
                {quotes.map((q) => (
                  <li key={q.id}>{q.quoteKind} · {String(q.premium ?? "—")}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="fin-section">
            <h2 className="fin-section__title">Policies</h2>
            {!policies.length ? <p className="text-muted-foreground">No policies issued.</p> : (
              <ul className="space-y-2 text-sm">
                {policies.map((p) => (
                  <li key={p.id}>{p.policyNumber} · {p.status}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="fin-section">
            <h2 className="fin-section__title">Claims</h2>
            {!claims.length ? <p className="text-muted-foreground">No claim notifications.</p> : (
              <ul className="space-y-2 text-sm">
                {claims.map((c) => (
                  <li key={c.id}>{c.status} · {c.description}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </FinanceDashboardShell>
  );
}

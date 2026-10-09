import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import {
  MOTOR_INSURERS,
  type MotorInsurer,
  type MotorPremiumQuote,
  type MotorQuoteInput,
  type ScenarioAssessment,
} from "../lib/insurance-engine";
import {
  submitMotorApplication,
  uploadInsuranceDocument,
  type InsuranceDocumentRef,
  type MotorInsuranceApplication,
} from "../services/insurance.service";

interface InsuranceApplyFormProps {
  input: MotorQuoteInput;
  insurer: MotorInsurer;
  quote: MotorPremiumQuote;
  assessment: ScenarioAssessment;
}

const L = "text-xs font-semibold text-muted-foreground";

function docSlots(input: MotorQuoteInput, inspection: boolean): string[] {
  if (input.scenario === "new") {
    return ["Dealer invoice", "Owner PAN / Aadhaar", ...(input.transferredNcb ? ["NCB reserving letter"] : [])];
  }
  const base = input.scenario === "used" ? ["RC / RTO transfer receipt", "Form 29 / 30", "Seller's policy copy"] : ["RC (front & back)", "Previous policy"];
  if (input.scenario === "used" && input.transferredNcb) base.push("Your NCB certificate");
  if (inspection) base.push("Vehicle photos (4 sides + odometer)");
  return base;
}

export function InsuranceApplyForm({ input, insurer, quote, assessment }: InsuranceApplyFormProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [owner, setOwner] = useState({
    fullName: user?.fullName ?? "",
    phone: (user?.phone ?? "").replace(/\D/g, "").slice(-10),
    email: user?.email ?? "",
    dob: "",
    address: "",
    pincode: "",
    nomineeName: "",
    nomineeRelation: "Spouse",
    nomineeAge: "",
  });
  const [vehicle, setVehicle] = useState({ registrationNumber: "", chassisNumber: "", engineNumber: "", variant: "", hypothecation: "" });
  const [prev, setPrev] = useState({ insurer: "", policyNumber: "", expiryDate: "" });
  const [docs, setDocs] = useState<InsuranceDocumentRef[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<MotorInsuranceApplication | null>(null);

  const slots = useMemo(() => docSlots(input, assessment.inspectionRequired), [input, assessment.inspectionRequired]);
  const needsNominee = input.planType !== "own_damage" && !input.hasOtherPaCover;

  if (!user) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Sign in so we can save your application, share updates and keep your policy in your vault.</p>
        <Button className="w-full rounded-xl" asChild>
          <Link to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>Sign in to continue</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    const meta = done.metadata;
    return (
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">Application submitted — ref {meta.reference}</p>
            <p className="text-muted-foreground">No payment has been taken yet.</p>
          </div>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Our insurance desk verifies your details with {insurer.shortName}.</li>
          {assessment.inspectionRequired && <li>You get an inspection link / surveyor visit for the break-in check.</li>}
          <li>{insurer.shortName} confirms the final premium (indicative {formatCurrency(quote.totalPremium)}).</li>
          <li>You pay on the insurer's secure payment link — the policy PDF is issued instantly after payment.</li>
        </ol>
        <Button className="w-full rounded-xl" asChild>
          <Link to="/dashboard/customer/insurance">Track in My insurance</Link>
        </Button>
      </div>
    );
  }

  const onUpload = async (label: string, file: File | undefined) => {
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
    const r = await submitMotorApplication({
      insurerSlug: insurer.slug,
      quoteInput: input,
      owner: {
        fullName: owner.fullName,
        phone: owner.phone,
        email: owner.email || undefined,
        dob: owner.dob || undefined,
        address: owner.address,
        pincode: owner.pincode,
        nomineeName: needsNominee ? owner.nomineeName : undefined,
        nomineeRelation: needsNominee ? owner.nomineeRelation : undefined,
        nomineeAge: needsNominee && owner.nomineeAge ? Number(owner.nomineeAge) : undefined,
      },
      vehicle,
      previousPolicy: input.scenario === "new" ? undefined : prev,
      documents: docs,
      consent,
    });
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("Application submitted");
    setDone(r.data);
  };

  return (
    <div className="ins-apply-form space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">Owner (as on RC / invoice)</legend>
        <div className="sm:col-span-2">
          <Label className={L} htmlFor="ap-name">Full name</Label>
          <Input id="ap-name" className="mt-1" value={owner.fullName} onChange={(e) => setOwner({ ...owner, fullName: e.target.value })} />
        </div>
        <div>
          <Label className={L} htmlFor="ap-phone">Mobile</Label>
          <Input id="ap-phone" className="mt-1" inputMode="numeric" maxLength={10} value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value.replace(/\D/g, "") })} placeholder="10-digit" />
        </div>
        <div>
          <Label className={L} htmlFor="ap-email">Email (policy PDF)</Label>
          <Input id="ap-email" className="mt-1" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} />
        </div>
        <div>
          <Label className={L} htmlFor="ap-dob">Date of birth</Label>
          <Input id="ap-dob" className="mt-1" type="date" value={owner.dob} onChange={(e) => setOwner({ ...owner, dob: e.target.value })} />
        </div>
        <div>
          <Label className={L} htmlFor="ap-pin">Pincode</Label>
          <Input id="ap-pin" className="mt-1" inputMode="numeric" maxLength={6} value={owner.pincode} onChange={(e) => setOwner({ ...owner, pincode: e.target.value.replace(/\D/g, "") })} />
        </div>
        <div className="sm:col-span-2">
          <Label className={L} htmlFor="ap-addr">Address</Label>
          <Input id="ap-addr" className="mt-1" value={owner.address} onChange={(e) => setOwner({ ...owner, address: e.target.value })} placeholder="House, street, locality, city" />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">Vehicle</legend>
        {input.scenario !== "new" && (
          <div>
            <Label className={L} htmlFor="ap-reg">Registration no.</Label>
            <Input id="ap-reg" className="mt-1 uppercase" value={vehicle.registrationNumber} onChange={(e) => setVehicle({ ...vehicle, registrationNumber: e.target.value.toUpperCase() })} placeholder="DL01AB1234" />
          </div>
        )}
        <div>
          <Label className={L} htmlFor="ap-chassis">Chassis no.{input.scenario === "new" ? " (from invoice)" : " (optional)"}</Label>
          <Input id="ap-chassis" className="mt-1 uppercase" value={vehicle.chassisNumber} onChange={(e) => setVehicle({ ...vehicle, chassisNumber: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <Label className={L} htmlFor="ap-engine">Engine no. (optional)</Label>
          <Input id="ap-engine" className="mt-1 uppercase" value={vehicle.engineNumber} onChange={(e) => setVehicle({ ...vehicle, engineNumber: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <Label className={L} htmlFor="ap-hyp">Loan / hypothecation bank (if any)</Label>
          <Input id="ap-hyp" className="mt-1" value={vehicle.hypothecation} onChange={(e) => setVehicle({ ...vehicle, hypothecation: e.target.value })} placeholder="e.g. HDFC Bank" />
        </div>
      </fieldset>

      {input.scenario !== "new" && (
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-bold">{input.scenario === "used" ? "Existing policy on vehicle (if any)" : "Previous policy"}</legend>
          <div>
            <Label className={L} htmlFor="ap-pins">Insurer</Label>
            <select id="ap-pins" className="ins-select mt-1" value={prev.insurer} onChange={(e) => setPrev({ ...prev, insurer: e.target.value })}>
              <option value="">Select</option>
              {MOTOR_INSURERS.map((i) => (
                <option key={i.slug} value={i.shortName}>{i.shortName}</option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <Label className={L} htmlFor="ap-pno">Policy no.</Label>
            <Input id="ap-pno" className="mt-1" value={prev.policyNumber} onChange={(e) => setPrev({ ...prev, policyNumber: e.target.value })} />
          </div>
          <div>
            <Label className={L} htmlFor="ap-pexp">Expiry date</Label>
            <Input id="ap-pexp" className="mt-1" type="date" value={prev.expiryDate} onChange={(e) => setPrev({ ...prev, expiryDate: e.target.value })} />
          </div>
        </fieldset>
      )}

      {needsNominee && (
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-bold">Nominee — PA owner-driver cover</legend>
          <div>
            <Label className={L} htmlFor="ap-nom">Name</Label>
            <Input id="ap-nom" className="mt-1" value={owner.nomineeName} onChange={(e) => setOwner({ ...owner, nomineeName: e.target.value })} />
          </div>
          <div>
            <Label className={L} htmlFor="ap-nrel">Relation</Label>
            <select id="ap-nrel" className="ins-select mt-1" value={owner.nomineeRelation} onChange={(e) => setOwner({ ...owner, nomineeRelation: e.target.value })}>
              {["Spouse", "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Other"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className={L} htmlFor="ap-nage">Age</Label>
            <Input id="ap-nage" className="mt-1" inputMode="numeric" maxLength={3} value={owner.nomineeAge} onChange={(e) => setOwner({ ...owner, nomineeAge: e.target.value.replace(/\D/g, "") })} />
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-bold">Documents (PDF / photo, optional now — speeds up issuance)</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {slots.map((label) => {
            const doc = docs.find((d) => d.label === label);
            return (
              <li key={label} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{label}</span>
                {doc ? (
                  <span className="flex items-center gap-1 text-primary">
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
      </fieldset>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" className="mt-0.5 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I declare the details are true, the vehicle has no undisclosed damage, and I authorise MotorCart to share my details with{" "}
          {insurer.name} to obtain a final quote and issue the policy. Wrong disclosure can lead to claim rejection.
        </span>
      </label>

      <Button className="w-full rounded-xl" disabled={submitting || !consent} onClick={() => void submit()}>
        {submitting ? "Submitting…" : `Submit to ${insurer.shortName} · ${formatCurrency(quote.totalPremium)}`}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        No payment now. You pay only after {insurer.shortName} confirms the final premium, on the insurer's own secure link.
      </p>
    </div>
  );
}

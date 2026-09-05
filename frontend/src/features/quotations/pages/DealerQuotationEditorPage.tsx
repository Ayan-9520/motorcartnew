import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDealer } from "@/features/dealer-crm/hooks/useDealer";
import { fetchDealerLeads } from "@/features/dealer-crm/services/dealer.service";
import { api, apiErrorMessage } from "@/lib/api/axios";
import { formatCurrency } from "@/lib/utils";
import { setPageMeta } from "@/utils/seo";
import { createQuotation, getQuotation, issueQuotation, updateQuotation } from "../services/quotations.service";
import { QuotationWorkspaceShell, useQuotationWorkspace } from "../components/QuotationWorkspaceShell";
import type { QuotationRecord } from "../types";

type InventoryOption = {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  ex_showroom_price?: number;
  stock_status?: string;
};

type LeadOption = {
  id: string;
  name: string;
  phone: string;
  metadata?: { customer_user_id?: string };
};

const ZERO = {
  exShowroomAmount: 0,
  rtoAmount: 0,
  insuranceAmount: 0,
  accessoriesAmount: 0,
  financeAmount: 0,
  exchangeAmount: 0,
  otherCharges: 0,
  discountAmount: 0,
  taxAmount: 0,
};

function payable(p: typeof ZERO) {
  return Math.max(
    0,
    p.exShowroomAmount +
      p.rtoAmount +
      p.insuranceAmount +
      p.accessoriesAmount +
      p.otherCharges +
      p.taxAmount -
      p.discountAmount -
      p.exchangeAmount,
  );
}

export function DealerQuotationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { dealer } = useDealer();
  const { basePath } = useQuotationWorkspace();
  const [existing, setExisting] = useState<QuotationRecord | null>(null);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [inventory, setInventory] = useState<InventoryOption[]>([]);
  const [leadId, setLeadId] = useState(params.get("leadId") ?? "");
  const [customerUserId, setCustomerUserId] = useState(params.get("customerUserId") ?? "");
  const [customerPhone, setCustomerPhone] = useState(params.get("phone") ?? "");
  const [inventoryId, setInventoryId] = useState(params.get("inventoryId") ?? "");
  const [pincode, setPincode] = useState("");
  const [notes, setNotes] = useState("");
  const [pricing, setPricing] = useState(ZERO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPageMeta({ title: id ? "Edit quotation" : "New quotation" });
  }, [id]);

  useEffect(() => {
    if (!dealer) return;
    void fetchDealerLeads(dealer.id).then((rows) => setLeads((rows ?? []) as LeadOption[]));
    void api
      .get<{ data?: InventoryOption[] }>("/api/new-car/inventory", { params: { dealer_id: dealer.id } })
      .then(({ data }) => setInventory(data.data ?? []))
      .catch(() => setInventory([]));
  }, [dealer]);

  useEffect(() => {
    if (!id) return;
    void getQuotation(id).then((q) => {
      setExisting(q);
      setLeadId(q.lead_id ?? "");
      setInventoryId(q.inventory_id ?? "");
      setPincode(q.pincode ?? "");
      setNotes(q.notes ?? "");
      setPricing({
        exShowroomAmount: q.ex_showroom_amount,
        rtoAmount: q.rto_amount,
        insuranceAmount: q.insurance_amount,
        accessoriesAmount: q.accessories_amount,
        financeAmount: q.finance_amount,
        exchangeAmount: q.exchange_amount,
        otherCharges: q.other_charges,
        discountAmount: q.discount_amount,
        taxAmount: q.tax_amount,
      });
    });
  }, [id]);

  const selectedInv = useMemo(() => inventory.find((i) => i.id === inventoryId), [inventory, inventoryId]);

  useEffect(() => {
    if (!id && selectedInv && pricing.exShowroomAmount <= 0 && selectedInv.ex_showroom_price) {
      setPricing((p) => ({ ...p, exShowroomAmount: Number(selectedInv.ex_showroom_price) }));
    }
  }, [id, selectedInv, pricing.exShowroomAmount]);

  const onLeadChange = (value: string) => {
    setLeadId(value);
    const lead = leads.find((l) => l.id === value);
    if (lead?.metadata?.customer_user_id) setCustomerUserId(lead.metadata.customer_user_id);
    if (lead?.phone) setCustomerPhone(lead.phone);
  };

  const save = async (issueAfter: boolean) => {
    if (!dealer) return;
    setSaving(true);
    try {
      const payload = {
        dealerId: dealer.id,
        customerUserId: customerUserId || undefined,
        customerPhone: customerPhone || undefined,
        leadId: leadId || undefined,
        inventoryId: inventoryId || undefined,
        pincode: pincode || undefined,
        notes: notes || undefined,
        ...pricing,
      };
      const row = existing
        ? await updateQuotation(existing.id, payload)
        : await createQuotation(payload);
      const finalRow = issueAfter ? await issueQuotation(row.id) : row;
      toast.success(issueAfter ? "Quotation issued" : "Draft saved");
      navigate(`${basePath}/${finalRow.id}`);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const moneyField = (key: keyof typeof ZERO, label: string) => (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={0}
        step="1"
        className="mt-1"
        value={pricing[key] || ""}
        onChange={(e) => setPricing((p) => ({ ...p, [key]: Number(e.target.value || 0) }))}
      />
    </label>
  );

  return (
    <QuotationWorkspaceShell
      title={existing ? `Edit ${existing.quotation_number}` : "New quotation"}
      description="Enter pricing components. The payable total is calculated by the server and cannot be forged."
      crumbs={[
        { label: "Quotations", href: basePath },
        { label: existing ? "Edit" : "New" },
      ]}
    >
      <div className="dealer-os-card space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Lead (optional)</span>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={leadId}
              onChange={(e) => onLeadChange(e.target.value)}
            >
              <option value="">No lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.phone}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">New-car inventory (optional)</span>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={inventoryId}
              onChange={(e) => setInventoryId(e.target.value)}
            >
              <option value="">No inventory row</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.brand} {i.model} {i.variant ?? ""} · {i.stock_status ?? "stock"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Customer account ID</span>
            <Input className="mt-1" value={customerUserId} onChange={(e) => setCustomerUserId(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Customer phone (if no account ID)</span>
            <Input className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Pincode</span>
            <Input className="mt-1" value={pincode} onChange={(e) => setPincode(e.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moneyField("exShowroomAmount", "Ex-showroom")}
          {moneyField("rtoAmount", "RTO")}
          {moneyField("insuranceAmount", "Insurance")}
          {moneyField("accessoriesAmount", "Accessories")}
          {moneyField("otherCharges", "Other charges")}
          {moneyField("taxAmount", "Tax")}
          {moneyField("discountAmount", "Discount")}
          {moneyField("exchangeAmount", "Exchange / trade-in")}
          {moneyField("financeAmount", "Indicative finance (not a sanction)")}
        </div>

        <p className="text-sm">
          Estimated payable: <span className="font-semibold">{formatCurrency(payable(pricing))}</span>
          <span className="text-muted-foreground"> — server total is authoritative</span>
        </p>

        <label className="block text-sm">
          <span className="text-muted-foreground">Notes / terms</span>
          <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl" disabled={saving} onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button className="rounded-xl" variant="secondary" disabled={saving} onClick={() => void save(true)}>
            Issue quotation
          </Button>
          <Button variant="ghost" asChild>
            <Link to={basePath}>Cancel</Link>
          </Button>
        </div>
      </div>
    </QuotationWorkspaceShell>
  );
}

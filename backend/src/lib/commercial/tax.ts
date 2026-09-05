import { CommercialError } from "./errors";

export type TaxRates = {
  cgstPct?: number;
  sgstPct?: number;
  igstPct?: number;
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

/** Configurable GST primitives. Rates must be supplied — none are assumed. */
export function calculateInvoiceTotals(
  lineTaxables: number[],
  rates: TaxRates,
  intraState: boolean,
  otherCharges = 0,
) {
  if (!lineTaxables.length) throw new CommercialError("Invoice needs line items", 400, "NO_LINE_ITEMS");
  const taxable = money(lineTaxables.reduce((s, n) => s + n, 0));
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (intraState) {
    if (rates.cgstPct == null || rates.sgstPct == null) {
      throw new CommercialError("CGST/SGST rates are not configured", 400, "TAX_RATE_NOT_CONFIGURED");
    }
    cgst = money((taxable * rates.cgstPct) / 100);
    sgst = money((taxable * rates.sgstPct) / 100);
  } else {
    if (rates.igstPct == null) {
      throw new CommercialError("IGST rate is not configured", 400, "TAX_RATE_NOT_CONFIGURED");
    }
    igst = money((taxable * rates.igstPct) / 100);
  }
  const total = money(taxable + cgst + sgst + igst + otherCharges);
  return { taxable, cgst, sgst, igst, otherCharges: money(otherCharges), total };
}

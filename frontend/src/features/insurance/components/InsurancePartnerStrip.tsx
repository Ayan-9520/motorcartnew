import { BrandLogo } from "@/components/ui/BrandLogo";
import { MOCK_INSURANCE_PARTNERS } from "../data/mock-insurers";

export function InsurancePartnerStrip() {
  if (!MOCK_INSURANCE_PARTNERS.length) return null;
  return (
    <section className="ins-partners">
      <p className="ins-partners__label">IRDAI-authorised partners</p>
      <ul className="ins-partners__grid">
        {MOCK_INSURANCE_PARTNERS.map((p) => (
          <li key={p.id} className="ins-partners__item">
            <BrandLogo src={p.logoUrl ?? ""} alt={p.name} size="sm" />
            <span className="text-xs font-medium truncate">{p.name}</span>
            <span className="text-[10px] text-emerald-600">{p.claimSettlementRatio}% CSR</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

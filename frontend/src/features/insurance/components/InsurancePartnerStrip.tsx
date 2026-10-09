import { MOTOR_INSURERS } from "../lib/insurance-engine";
import { InsurerMonogram } from "./InsuranceBits";

export function InsurancePartnerStrip() {
  return (
    <section className="ins-partners">
      <p className="ins-partners__label">Insurers compared · IRDAI-registered general insurers</p>
      <ul className="ins-partners__grid">
        {MOTOR_INSURERS.map((p) => (
          <li key={p.slug} className="ins-partners__item">
            <InsurerMonogram name={p.shortName} className="h-9 w-9 text-xs" />
            <span className="w-full truncate text-xs font-medium">{p.shortName}</span>
            <span className="text-[10px] text-primary">{p.claimSettlementRatio}% claims settled</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

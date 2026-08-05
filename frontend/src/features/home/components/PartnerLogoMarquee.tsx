import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PartnerLogoItem } from "@/features/home/data/homepage-data";
import { PARTNER_BANK_LOGOS, PARTNER_CAR_LOGOS } from "@/features/home/data/homepage-data";
import { realDataOnly } from "@/config/real-data";

function LogoTile({ item }: { item: PartnerLogoItem }) {
  return (
    <Link to={item.href} className="partner-logo-tile group" title={item.name} aria-label={item.name}>
      <BrandLogo src={item.logo} alt={item.name} size="sm" className="partner-logo-img" />
    </Link>
  );
}

function MarqueeRow({
  items,
  direction,
  label,
}: {
  items: PartnerLogoItem[];
  direction: "ltr" | "rtl";
  label: string;
}) {
  const loop = [...items, ...items];

  return (
    <div className="partner-marquee-group">
      <p className="partner-marquee-label">{label}</p>
      <div className="partner-marquee-row" data-direction={direction}>
        <div className="partner-marquee-track" aria-hidden="true">
          {loop.map((item, i) => (
            <LogoTile key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

type PartnerLogoMarqueeProps = {
  bankLogos?: PartnerLogoItem[];
  carLogos?: PartnerLogoItem[];
};

export function PartnerLogoMarquee({ bankLogos, carLogos }: PartnerLogoMarqueeProps) {
  const banks = bankLogos?.length ? bankLogos : realDataOnly ? [] : PARTNER_BANK_LOGOS;
  const cars = carLogos?.length ? carLogos : realDataOnly ? [] : PARTNER_CAR_LOGOS;

  if (!banks.length && !cars.length) return null;

  return (
    <div className="partner-marquee">
      <MarqueeRow items={banks} direction="ltr" label="Banking partners" />
      <MarqueeRow items={cars} direction="rtl" label="Automobile brands" />
    </div>
  );
}

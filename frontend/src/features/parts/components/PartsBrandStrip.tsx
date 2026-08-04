import { Link } from "react-router-dom";
import { PARTS_HUB_BRANDS } from "../data/parts-hub-data";

export function PartsBrandStrip({ browseHref = "/parts/browse" }: { browseHref?: string }) {
  return (
    <section className="container pb-10 pt-2">
      <div className="parts-hub-section-head parts-hub-section-head--center mb-5">
        <p className="parts-hub-section-eyebrow">OEM &amp; aftermarket</p>
        <p className="parts-hub-section-desc text-xs font-bold uppercase tracking-wider">Authorised &amp; trusted brands</p>
      </div>
      <ul className="parts-brands-row">
        {PARTS_HUB_BRANDS.map((b) => (
          <li key={b.name}>
            <Link to={browseHref} className="parts-brand-tile group overflow-hidden" title={b.name}>
              <img
                src={b.image}
                alt={b.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="parts-brand-tile-label">{b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

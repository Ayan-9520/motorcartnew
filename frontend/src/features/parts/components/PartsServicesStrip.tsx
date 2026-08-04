import { Link } from "react-router-dom";
import { PARTS_HUB_SERVICES } from "../data/parts-hub-data";

export function PartsServicesStrip() {
  return (
    <section className="parts-hub-services-section">
      <div className="container">
        <div className="parts-hub-section-head parts-hub-section-head--center">
          <p className="parts-hub-section-eyebrow">Garage OS</p>
          <h2 className="parts-hub-section-title">Built for professional garages</h2>
          <p className="parts-hub-section-desc">
            GST credit-ready invoices, slab wholesale pricing, COD &amp; online settlement, and AI fitment —
            across cars, CV, trucks, buses &amp; equipment.
          </p>
        </div>
        <ul className="parts-services-grid">
          {PARTS_HUB_SERVICES.map((s) => (
            <li key={s.id}>
              <Link to={s.href} className="parts-service-item group">
                <span className="parts-service-icon">
                  <s.icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
                </span>
                <span className="parts-service-label">{s.label}</span>
                <span className="parts-service-desc">{s.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

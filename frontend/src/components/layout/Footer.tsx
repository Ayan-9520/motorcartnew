import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { MotorcartLogo } from "@/components/brand/MotorcartLogo";
import { FOOTER_COLUMNS, FOOTER_LEGAL_LINKS, SITE_CONTACT } from "@/content/site-content";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { SOCIAL_LINKS } from "@/features/home/data/homepage-data";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden />
      <div className="container relative">
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo inline-flex items-center no-underline">
              <MotorcartLogo variant="full" height={36} />
            </Link>
            <p className="site-footer__tagline">{SITE_TAGLINE}</p>

            <div className="site-footer__contact-card">
              <p className="site-footer__contact-title">Registered office</p>
              <address className="site-footer__address not-italic">
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {SITE_CONTACT.addressLine1}
                    <br />
                    {SITE_CONTACT.addressLine2}
                  </span>
                </span>
              </address>
              <ul className="site-footer__contact-list">
                <li>
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a href={`tel:${SITE_CONTACT.phoneTel}`}>{SITE_CONTACT.phoneDisplay}</a>
                </li>
                <li>
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
                </li>
              </ul>
              <p className="site-footer__hours">{SITE_CONTACT.hours}</p>
            </div>

            <div className="site-footer__social">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} aria-label={label} className="site-footer__social-btn">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="site-footer__columns">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="site-footer__col">
                <h3 className="site-footer__col-title">{col.title}</h3>
                <ul className="site-footer__col-links">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copy">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <nav className="site-footer__legal" aria-label="Privacy, terms and help">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link key={link.href} to={link.href} className="site-footer__legal-pill">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

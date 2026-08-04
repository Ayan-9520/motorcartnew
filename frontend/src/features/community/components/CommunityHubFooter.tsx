import { Link } from "react-router-dom";
import { MotorcartLogo } from "@/components/brand/MotorcartLogo";

const USEFUL_LINKS = [
  { label: "Explore New Cars", href: "/new-cars" },
  { label: "Express Delivery", href: "/vehicles" },
  { label: "Offer & Discount", href: "/finance" },
];

const LOAN_OFFERS = [
  { label: "7.75% Rate of Interest" },
  { label: "0% Processing Fee" },
  { label: "Prepayment Fee Nil" },
];

export function CommunityHubFooter() {
  return (
    <footer className="community-hub-footer community-premium-footer">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="community-hub-footer-title">About Us</h3>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
            Motorcart is India&apos;s AI-powered automobile ecosystem — buy, sell, finance, auction,
            and service vehicles with trusted dealers and lenders nationwide.
          </p>
        </div>

        <div>
          <h3 className="community-hub-footer-title">Useful Links</h3>
          <ul className="mt-3 space-y-2">
            {USEFUL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="text-sm text-primary-foreground/85 transition-colors hover:text-primary-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="community-hub-footer-title">Contact Details</h3>
          <div className="mt-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-4">
            <MotorcartLogo variant="full" height={32} alt="Motorcart" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
            Plot No.526, II Floor, Patparganj Industrial Area, New Delhi-110092
          </p>
        </div>

        <div>
          <h3 className="community-hub-footer-title">Special Offers For New Car Loan*</h3>
          <ul className="mt-3 space-y-2">
            {LOAN_OFFERS.map((item) => (
              <li key={item.label} className="text-sm text-primary-foreground/85">
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

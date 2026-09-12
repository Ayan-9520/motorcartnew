import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ContentDocPage, DocSection } from "@/components/marketing/ContentDocPage";
import { SITE_CONTACT } from "@/content/site-content";
import { setPageMeta } from "@/utils/seo";

const UPDATED = "September 2026";

export function PrivacyPage() {
  useEffect(() => {
    setPageMeta({
      title: "Privacy Policy — Motorcart.in",
      description: "How Motorcart collects, uses, and protects your personal data.",
    });
  }, []);

  return (
    <ContentDocPage
      eyebrow="Legal"
      title="Privacy Policy"
      lead="Your privacy matters. This policy explains what we collect on Motorcart.in and the Motorcart Android companion app (package in.motorcart.app), and how we use it."
      updated={UPDATED}
      compact
    >
      <DocSection title="1. Who we are">
        <p>
          Motorcart.in (&quot;Motorcart&quot;, &quot;we&quot;, &quot;us&quot;) operates an automotive
          marketplace, dealer tools, finance journeys, auctions, parts, services, community features,
          and the Motorcart mobile companion app in India. For privacy questions contact{" "}
          <a href={`mailto:${SITE_CONTACT.email}`} className="text-primary hover:underline">
            {SITE_CONTACT.email}
          </a>
          .
        </p>
      </DocSection>

      <DocSection title="2. Data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account data: name, email, phone, role (buyer, dealer, partner), KYC where required</li>
          <li>Listing & transaction data: vehicles, enquiries, bids, loan applications, bookings</li>
          <li>Community content: posts, photos, profile fields you choose to share</li>
          <li>Technical data: device, IP, cookies, analytics for security and product improvement</li>
        </ul>
      </DocSection>

      <DocSection title="3. How we use data">
        <p>We use personal data to operate the platform, verify users, prevent fraud, match finance offers, notify you about activity, and improve our services. We do not sell your personal data to third-party marketers.</p>
      </DocSection>

      <DocSection title="4. Sharing">
        <p>
          We share data with service providers (hosting, SMS/email, payments), lenders when you apply for
          finance, dealers when you enquire on a vehicle, and authorities when required by law.
        </p>
      </DocSection>

      <DocSection title="5. Your rights">
        <p>
          You may request access, correction, or deletion of your account data subject to legal retention
          needs. Use{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact
          </Link>{" "}
          or email {SITE_CONTACT.email}.
        </p>
      </DocSection>

      <DocSection title="6. Security & retention">
        <p>
          We use encryption, access controls, and monitoring appropriate to a fintech-automotive platform.
          Data is retained as long as your account is active or as needed for compliance and disputes.
        </p>
      </DocSection>

      <DocSection title="7. Changes">
        <p>We may update this policy; material changes will be posted on this page with a new date.</p>
      </DocSection>
    </ContentDocPage>
  );
}

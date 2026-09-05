import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentDocPage, DocSection } from "@/components/marketing/ContentDocPage";
import { setPageMeta } from "@/utils/seo";

export function PressPage() {
  useEffect(() => {
    setPageMeta({
      title: "Press — Motorcart.in",
      description: "Media kit, press releases, and spokesperson contacts for Motorcart.",
    });
  }, []);

  return (
    <ContentDocPage
      eyebrow="Press & media"
      title="Motorcart in the news"
      lead="For interviews, data requests, and brand assets — our communications team responds within one business day."
    >
      <DocSection title="Media contact">
        <p>
          <strong className="text-foreground">press@motorcart.in</strong>
          <br />
          Include your outlet, deadline, and topics (dealers, finance, auctions, EV, community).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button className="rounded-xl" asChild>
            <a href="mailto:press@motorcart.in">
              <Mail className="mr-2 h-4 w-4" />
              Email press desk
            </a>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/about">Company overview</Link>
          </Button>
        </div>
      </DocSection>

      <DocSection title="About Motorcart (boilerplate)">
        <p>
          Motorcart.in is India&apos;s AI-powered automotive ecosystem — connecting verified dealers,
          vehicle buyers, NBFC partners, auction houses, parts sellers, and an owner community on one
          platform. Products include Dealer OS (inventory & lead CRM), live auctions, bank-grade finance
          journeys, parts & service booking, and a separate social community for automotive enthusiasts.
        </p>
      </DocSection>

      <DocSection title="Brand assets">
        <p>Download logos and guidelines for editorial use (approval required for co-branding).</p>
        <Button variant="outline" className="mt-3 rounded-xl" type="button" disabled>
          <Download className="mr-2 h-4 w-4" />
          Media kit (coming soon)
        </Button>
      </DocSection>

      <DocSection title="Recent highlights">
        <ul className="list-disc space-y-2 pl-5">
          <li>Verified dealer partners across multiple cities</li>
          <li>Lender integrations for vehicle finance</li>
          <li>Motorcart Community — active member network</li>
        </ul>
      </DocSection>
    </ContentDocPage>
  );
}

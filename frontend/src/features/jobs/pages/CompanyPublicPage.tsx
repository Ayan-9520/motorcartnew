import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ContentDocPage } from "@/components/marketing/ContentDocPage";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";

type Company = {
  name: string;
  type: string;
  about?: string | null;
  website?: string | null;
  jobs: { id: string; title: string; location?: string | null }[];
  oemAuthorized: string[];
  certifications: string[];
  rating: { overall: number | null; count: number };
};

export function CompanyPublicPage() {
  const { slug } = useParams();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!slug) return;
    void api.get<{ data: Company }>(`/api/company/${slug}`).then((res) => {
      setCompany(res.data.data);
      setPageMeta({ title: `${res.data.data.name} — MotorCart` });
    }).catch(() => setCompany(null));
  }, [slug]);

  if (!company) {
    return (
      <ContentDocPage eyebrow="Company" title="Company" lead="This company page is not available.">
        <p className="text-muted-foreground">No public company profile for this slug.</p>
      </ContentDocPage>
    );
  }

  return (
    <ContentDocPage
      eyebrow={company.type}
      title={company.name}
      lead={company.about ?? "Automotive partner on MotorCart."}
    >
      {company.website ? (
        <p className="mb-4">
          <a className="text-primary underline" href={company.website} rel="noreferrer">
            {company.website}
          </a>
        </p>
      ) : null}
      {company.oemAuthorized.length ? (
        <p className="mb-2 text-sm">OEM authorized: {company.oemAuthorized.join(", ")}</p>
      ) : null}
      {company.certifications.length ? (
        <p className="mb-2 text-sm">Certifications: {company.certifications.join(", ")}</p>
      ) : null}
      <p className="mb-6 text-sm text-muted-foreground">
        Rating {company.rating.overall ?? "—"} ({company.rating.count} reviews)
      </p>
      <h2 className="mb-3 text-lg font-semibold">Jobs</h2>
      {!company.jobs.length ? (
        <p className="text-muted-foreground">No open jobs.</p>
      ) : (
        <ul className="space-y-2">
          {company.jobs.map((job) => (
            <li key={job.id}>
              <Link className="hover:underline" to={`/jobs/${job.id}`}>
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6">
        <Link className="text-sm text-primary underline" to={`/company/${slug}/jobs`}>
          All jobs
        </Link>
      </p>
    </ContentDocPage>
  );
}

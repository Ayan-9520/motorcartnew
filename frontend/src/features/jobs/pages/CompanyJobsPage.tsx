import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ContentDocPage } from "@/components/marketing/ContentDocPage";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";

type JobRow = { id: string; title: string; location?: string | null };

export function CompanyJobsPage() {
  const { slug } = useParams();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [name, setName] = useState("Company");

  useEffect(() => {
    if (!slug) return;
    void api.get<{ data: JobRow[]; organization?: { name: string } }>(`/api/company/${slug}/jobs`).then((res) => {
      setJobs(res.data.data ?? []);
      setName(res.data.organization?.name ?? "Company");
      setPageMeta({ title: `Jobs — ${res.data.organization?.name ?? slug}` });
    }).catch(() => setJobs([]));
  }, [slug]);

  return (
    <ContentDocPage eyebrow="Jobs" title={`${name} jobs`} lead="Open roles from this organization.">
      {!jobs.length ? (
        <p className="text-muted-foreground">No open jobs.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link className="hover:underline" to={`/jobs/${job.id}`}>
                {job.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ContentDocPage>
  );
}

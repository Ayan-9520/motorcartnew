import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContentDocPage } from "@/components/marketing/ContentDocPage";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";
import toast from "react-hot-toast";

type Job = {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  careerPath?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  organization?: { displayName: string; slug: string };
};

export function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.get<{ data: Job }>(`/api/jobs/${id}`).then((res) => {
      setJob(res.data.data);
      setPageMeta({ title: `${res.data.data.title} — Jobs` });
    }).catch(() => setJob(null));
  }, [id]);

  const apply = async () => {
    if (!id) return;
    try {
      await api.post(`/api/jobs/${id}/apply`, {});
      toast.success("Application submitted");
    } catch {
      toast.error("Sign in as a candidate to apply");
    }
  };

  if (!job) {
    return (
      <ContentDocPage eyebrow="Jobs" title="Job" lead="This posting is not available.">
        <p className="text-muted-foreground">The job may have closed or the link is invalid.</p>
      </ContentDocPage>
    );
  }

  return (
    <ContentDocPage
      eyebrow={job.organization?.displayName ?? "Jobs"}
      title={job.title}
      lead={[job.location, job.careerPath].filter(Boolean).join(" · ") || "Automotive role"}
      actions={
        <Button className="rounded-xl" onClick={() => void apply()}>
          Apply
        </Button>
      }
    >
      <div className="prose prose-sm max-w-none whitespace-pre-wrap">{job.description}</div>
      {job.salaryMin == null && job.salaryMax == null ? (
        <p className="mt-4 text-sm text-muted-foreground">Salary not disclosed by the employer.</p>
      ) : null}
    </ContentDocPage>
  );
}

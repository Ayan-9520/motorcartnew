import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContentDocPage } from "@/components/marketing/ContentDocPage";
import { setPageMeta } from "@/utils/seo";
import { api } from "@/lib/api/axios";

type JobRow = {
  id: string;
  title: string;
  location?: string | null;
  careerPath?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

export function JobsMarketplacePage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    setPageMeta({ title: "Automotive jobs — MotorCart", description: "Ecosystem jobs from dealers, OEMs, workshops, and partners." });
    void api.get<{ data: JobRow[] }>("/api/jobs").then((res) => setJobs(res.data.data ?? [])).catch(() => setJobs([]));
  }, []);

  return (
    <ContentDocPage
      eyebrow="Jobs"
      title="Automotive jobs marketplace"
      lead="Roles posted by MotorCart partner companies. MotorCart’s own hiring remains on Careers."
    >
      {!jobs.length ? (
        <p className="text-muted-foreground">No open jobs yet.</p>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <Link to={`/jobs/${job.id}`} className="font-semibold hover:underline">
                    {job.title}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location ?? "India"}
                    {job.careerPath ? ` · ${job.careerPath}` : ""}
                  </p>
                  {job.salaryMin != null || job.salaryMax != null ? (
                    <p className="mt-1 text-sm">
                      {job.salaryMin ?? "—"} – {job.salaryMax ?? "—"}
                    </p>
                  ) : null}
                </div>
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ContentDocPage>
  );
}

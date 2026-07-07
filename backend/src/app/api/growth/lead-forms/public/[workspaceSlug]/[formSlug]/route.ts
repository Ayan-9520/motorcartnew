import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireGrowthPublic } from "@/lib/growth/guard";
import { getPublicLeadForm } from "@/services/growth-lead-form.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string; formSlug: string }> }
) {
  const gate = requireGrowthPublic("leads");
  if ("response" in gate) return gate.response;

  const { workspaceSlug, formSlug } = await params;
  const pub = await getPublicLeadForm(workspaceSlug, formSlug);
  if (!pub) return err("Not found", 404);

  return ok({
    data: {
      workspace_slug: pub.workspace.slug,
      workspace_name: pub.workspace.name,
      form: {
        id: pub.form.id,
        name: pub.form.name,
        slug: pub.form.slug,
        fields_schema: pub.form.fieldsSchema,
        thank_you_url: pub.form.thankYouUrl,
      },
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { normalizeDomain, runImportScan } from "@/lib/deployments/import-scan";
import { bulkImportCandidates } from "@/lib/deployments/bulk-import";

const bodySchema = z.object({
  /** Restrict to these domains; omit to import every not-yet-imported candidate. */
  domains: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });
    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      const { candidates } = await runImportScan(actor.tenantId);
      // Normalize the same way candidate.domain is keyed (strips "www.", trailing dot,
      // lowercases) so a caller passing e.g. "www.example.com" still matches.
      const wanted = parsed.data.domains
        ? new Set(parsed.data.domains.map((d) => normalizeDomain(d)))
        : null;
      const targets = candidates.filter(
        (c) => !c.already_imported_deployment_id && (!wanted || wanted.has(c.domain)),
      );
      const result = await bulkImportCandidates(actor.tenantId, actor.actorId, targets);
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}

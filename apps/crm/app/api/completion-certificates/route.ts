import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CompletionCertificateModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1),
  work_summary: z.string(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  contact_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  worklog_ids: z.array(z.string()).optional(),
  ticket_ids: z.array(z.string()).optional(),
  work_period_start: z.coerce.date().nullable().optional(),
  work_period_end: z.coerce.date().nullable().optional(),
  total_hours: z.number().nullable().optional(),
  offer_id: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "completion_certificate", action: "view", scope: "global" });
    return await withDb(async () => {
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q")?.trim();
      const contactId = searchParams.get("contact_id")?.trim();
      const projectId = searchParams.get("project_id")?.trim();
      const includeArchived = searchParams.get("include_archived") === "true";
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (!includeArchived) {
        filter.is_archived = { $ne: true };
      }
      if (contactId) {
        filter.contact_id = contactId;
      }
      if (projectId) {
        filter.project_id = projectId;
      }
      if (q) {
        filter.$or = [
          { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          {
            certificate_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
          },
        ];
      }
      const rows = await CompletionCertificateModel.find(filter)
        .sort({ updated_at: -1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "completion_certificate", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "completion_certificate");
      const certificate_number = formatNumber("CC", n);
      const doc = await CompletionCertificateModel.create({
        tenantId: actor.tenantId,
        certificate_number,
        contact_id: b.contact_id ?? null,
        project_id: b.project_id ?? null,
        created_by: actor.actorId,
        status: b.status ?? "draft",
        worklog_ids: b.worklog_ids ?? [],
        ticket_ids: b.ticket_ids ?? [],
        title: b.title,
        work_summary: b.work_summary,
        work_period_start: b.work_period_start ?? null,
        work_period_end: b.work_period_end ?? null,
        total_hours: b.total_hours ?? null,
        offer_id: b.offer_id ?? null,
        client_name: null,
        client_title: null,
        client_signature: null,
        signed_at: null,
        pdf_url: null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

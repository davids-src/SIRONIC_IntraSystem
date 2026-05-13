import { NextResponse } from "next/server";
import { z } from "zod";
import { ContractModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  ticket_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  type: z.enum(["generated", "uploaded"]),
  category: z.string().min(1),
  name: z.string().min(1),
  status: z
    .enum(["draft", "sent", "signed_digital", "signed_paper", "cancelled"])
    .optional(),
  body: z.string().nullable().optional(),
  variables_filled: z.record(z.string(), z.string()).nullable().optional(),
  pdf_url: z.string().nullable().optional(),
  portal_visible: z.boolean().optional(),
  signing_type: z.enum(["digital", "paper", "none"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const contactId = searchParams.get("contact_id")?.trim();
    const projectId = searchParams.get("project_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contactId) {
        filter.contact_id = contactId;
      }
      if (projectId) {
        filter.project_id = projectId;
      }
      if (q) {
        filter.$or = [
          { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { contract_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await ContractModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "contract");
      const contract_number = formatNumber("SZ", n);
      const doc = await ContractModel.create({
        tenantId: actor.tenantId,
        contract_number,
        contact_id: b.contact_id,
        project_id: b.project_id ?? null,
        ticket_id: b.ticket_id ?? null,
        template_id: b.template_id ?? null,
        created_by: actor.actorId,
        type: b.type,
        category: b.category,
        name: b.name,
        status: b.status ?? "draft",
        body: b.body ?? null,
        variables_filled: b.variables_filled ?? null,
        pdf_url: b.pdf_url ?? null,
        portal_visible: b.portal_visible ?? false,
        signing_type: b.signing_type ?? "none",
        client_name: null,
        client_signature: null,
        signed_at: null,
        valid_from: null,
        valid_until: null,
        notes: b.notes ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

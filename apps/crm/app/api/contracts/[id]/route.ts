import { NextResponse } from "next/server";
import { z } from "zod";
import { ContractModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sanitizeDocumentHtml } from "@/lib/sanitize";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  contact_id: z.string().min(1).optional(),
  project_id: z.string().nullable().optional(),
  ticket_id: z.string().nullable().optional(),
  template_id: z.string().nullable().optional(),
  contract_number: z.string().optional(),
  category: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  status: z
    .enum(["draft", "sent", "signed_digital", "signed_paper", "cancelled"])
    .optional(),
  body: z.string().nullable().optional(),
  variables_filled: z.record(z.string(), z.string()).nullable().optional(),
  pdf_url: z.string().nullable().optional(),
  portal_visible: z.boolean().optional(),
  signing_type: z.enum(["digital", "paper", "none"]).optional(),
  notes: z.string().nullable().optional(),
  valid_from: z.coerce.date().nullable().optional(),
  valid_until: z.coerce.date().nullable().optional(),
  client_name: z.string().nullable().optional(),
  client_signature: z.string().nullable().optional(),
  signed_at: z.coerce.date().nullable().optional(),
});

// Ezek a mezők csak piszkozat (draft) állapotban módosíthatók – lásd
// SIRONIC_SYSTEM_MANUAL.md "kiküldés után zárolás" szabálya. Státusz-váltás
// (küldés, aláírás, portál láthatóság, jegyzet) nem-draft állapotban is
// engedélyezett, mert ez maga a munkafolyamat.
const CONTENT_ONLY_FIELDS = [
  "contact_id",
  "project_id",
  "ticket_id",
  "template_id",
  "contract_number",
  "category",
  "name",
  "body",
  "variables_filled",
  "pdf_url",
  "valid_from",
  "valid_until",
] as const;

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await ContractModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...parsed.data };

    return await withDb(async () => {
      const existing = await ContractModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if ((existing as any).status !== "draft") {
        for (const field of CONTENT_ONLY_FIELDS) {
          delete patch[field];
        }
      }

      if (typeof patch.body === "string") {
        patch.body = sanitizeDocumentHtml(patch.body);
      }

      const doc = await ContractModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "admin", scope: "global" });
    return await withDb(async () => {
      const res = await ContractModel.deleteOne({ _id: id, tenantId: actor.tenantId });
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

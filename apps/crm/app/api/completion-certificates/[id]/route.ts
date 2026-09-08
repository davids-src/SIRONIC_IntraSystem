import { NextResponse } from "next/server";
import { z } from "zod";
import { CompletionCertificateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { lineSchema } from "../schema";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  work_summary: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  contact_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  worklog_ids: z.array(z.string()).optional(),
  ticket_ids: z.array(z.string()).optional(),
  work_period_start: z.coerce.date().nullable().optional(),
  work_period_end: z.coerce.date().nullable().optional(),
  total_hours: z.number().nullable().optional(),
  offer_id: z.string().nullable().optional(),
  lines: z.array(lineSchema).optional(),
  client_name: z.string().nullable().optional(),
  client_title: z.string().nullable().optional(),
  client_signature: z.string().nullable().optional(),
  signed_at: z.coerce.date().nullable().optional(),
  pdf_url: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.coerce.date().nullable().optional(),
  archive_reason: z.string().nullable().optional(),
});

// A teljesítésigazolás tartalma (cím, összefoglaló, tételsorok, munkaidőszak,
// stb.) csak piszkozat (draft) állapotban módosítható – lásd
// SIRONIC_SYSTEM_MANUAL.md "kiküldés után zárolás" szabálya. A státusz-váltás
// (küldés, aláírás/elutasítás) és az archiválás ettől függetlenül mindig
// engedélyezett.
const CONTENT_ONLY_FIELDS = [
  "title",
  "work_summary",
  "contact_id",
  "project_id",
  "worklog_ids",
  "ticket_ids",
  "work_period_start",
  "work_period_end",
  "total_hours",
  "offer_id",
  "lines",
] as const;

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "completion_certificate", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await CompletionCertificateModel.findOne({
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
    guard(actor, { module: "completion_certificate", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...parsed.data };

    return await withDb(async () => {
      const existing = await CompletionCertificateModel.findOne({
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

      const doc = await CompletionCertificateModel.findOneAndUpdate(
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

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "completion_certificate", action: "admin", scope: "global" });
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Törölve";
    return await withDb(async () => {
      const doc = await CompletionCertificateModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_archived: true, archived_at: new Date(), archive_reason: reason } },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { InvoiceModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  title: z.string().nullable().optional(),
  total_amount: z.number(),
  currency: z.string().min(1).optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  issued_at: z.coerce.date().nullable().optional(),
  due_at: z.coerce.date().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "invoice", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const contactId = searchParams.get("contact_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contactId) {
        filter.contact_id = contactId;
      }
      if (q) {
        filter.$or = [
          { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { invoice_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await InvoiceModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "invoice", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "invoice");
      const invoice_number = formatNumber("INV", n);
      const doc = await InvoiceModel.create({
        tenantId: actor.tenantId,
        invoice_number,
        contact_id: b.contact_id,
        title: b.title ?? null,
        total_amount: b.total_amount,
        currency: b.currency ?? "HUF",
        status: b.status ?? "draft",
        issued_at: b.issued_at ?? null,
        due_at: b.due_at ?? null,
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

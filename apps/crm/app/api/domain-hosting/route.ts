import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactModel, DomainHostingRecordModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  record_type: z.enum(["domain", "hosting", "ssl"]),
  label: z.string().min(1),
  provider: z.string().nullable().optional(),
  expiry_date: z.coerce.date().nullable().optional(),
  auto_renew: z.boolean().nullable().optional(),
  details: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contact_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contactId) {
        filter.contact_id = contactId;
      }
      const rows = await DomainHostingRecordModel.find(filter)
        .sort({ record_type: 1, expiry_date: 1 })
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
    guard(actor, { module: "contact", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const contact = await ContactModel.findOne({
        _id: b.contact_id,
        tenantId: actor.tenantId,
      }).lean();
      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 400 });
      }
      const doc = await DomainHostingRecordModel.create({
        tenantId: actor.tenantId,
        contact_id: b.contact_id,
        record_type: b.record_type,
        label: b.label,
        provider: b.provider ?? null,
        expiry_date: b.expiry_date ?? null,
        auto_renew: b.auto_renew ?? null,
        details: b.details ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

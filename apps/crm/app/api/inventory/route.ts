import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactModel, InventoryItemModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["hardware", "software", "license"]),
  serial_number: z.string().nullable().optional(),
  status: z.enum(["active", "maintenance", "retired"]).optional(),
  assigned_to: z.string().nullable().optional(),
  warranty_end: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
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
      const rows = await InventoryItemModel.find(filter).sort({ updated_at: -1 }).lean();
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
      const doc = await InventoryItemModel.create({
        tenantId: actor.tenantId,
        contact_id: b.contact_id,
        name: b.name,
        category: b.category,
        serial_number: b.serial_number ?? null,
        status: b.status ?? "active",
        assigned_to: b.assigned_to ?? null,
        warranty_end: b.warranty_end ?? null,
        notes: b.notes ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

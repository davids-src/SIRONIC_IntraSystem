import { NextResponse } from "next/server";
import { z } from "zod";
import { SupplierModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  tax_number: z.string().nullable().optional(),
  registration_number: z.string().nullable().optional(),
  headquarters: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await SupplierModel.find({ tenantId: actor.tenantId })
        .sort({ name: 1 })
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
    guard(actor, { module: "settings", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      // Generate unique SU + 6 random digits
      let partner_id = "";
      let attempts = 0;
      do {
        partner_id = "SU" + String(Math.floor(100000 + Math.random() * 900000));
        const existing = await SupplierModel.findOne({ partner_id }).lean();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      const doc = await SupplierModel.create({
        tenantId: actor.tenantId,
        partner_id,
        name: b.name,
        tax_number: b.tax_number ?? null,
        registration_number: b.registration_number ?? null,
        headquarters: b.headquarters ?? null,
        email: b.email ?? null,
        phone: b.phone ?? null,
        bank_account: b.bank_account ?? null,
        notes: b.notes ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

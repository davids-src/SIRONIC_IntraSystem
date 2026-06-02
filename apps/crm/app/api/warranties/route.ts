import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WarrantyCardModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const warrantyLineSchema = z.object({
  price_list_item_id: z.string().nullable().optional(),
  name: z.string().min(1),
  serial_number: z.string().nullable().optional(),
  warranty_years: z.number().int().min(1),
  warranty_start: z.string().min(1),
  warranty_end: z.string().min(1),
});

const createSchema = z.object({
  contact_id: z.string().min(1),
  invoice_number: z.string().nullable().optional(),
  issue_date: z.string().min(1),
  lines: z.array(warrantyLineSchema).min(1),
  notes: z.string().nullable().optional(),
  status: z.enum(["active", "expired", "claimed", "void"]).default("active"),
});

/**
 * GET /api/warranties
 * Jótállási jegyek listázása (szűrés: contact_id, status)
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");
    const status = searchParams.get("status");

    return await withDb(async () => {
      const query: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contact_id) query.contact_id = contact_id;
      if (status) query.status = status;

      const rows = await WarrantyCardModel.find(query).sort({ created_at: -1 }).lean();

      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/warranties
 * Új jótállási jegy létrehozása (sorszám auto-generálás: JJY-XXXXXX)
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;

    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "warranty_card");
      const warranty_number = formatNumber("JJY", n);

      const doc = await WarrantyCardModel.create({
        tenantId: actor.tenantId,
        warranty_number,
        contact_id: b.contact_id,
        invoice_number: b.invoice_number ?? null,
        issue_date: new Date(b.issue_date),
        lines: b.lines.map((l) => ({
          price_list_item_id: l.price_list_item_id ?? null,
          name: l.name,
          serial_number: l.serial_number ?? null,
          warranty_years: l.warranty_years,
          warranty_start: new Date(l.warranty_start),
          warranty_end: new Date(l.warranty_end),
        })),
        notes: b.notes ?? null,
        status: b.status,
        pdf_url: null,
        created_by: actor.actorId ?? "system",
      });

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

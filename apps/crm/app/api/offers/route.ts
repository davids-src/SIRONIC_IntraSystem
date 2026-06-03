import { NextResponse } from "next/server";
import { z } from "zod";
import { OfferModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const offerLineSchema = z.object({
  price_list_item_id: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  net_unit_price: z.number(),
  tax_rate: z.number(),
  discount_percent: z.number().min(0).max(100).optional().default(0),
});

const createSchema = z.object({
  title: z.string().min(1),
  contact_id: z.string().min(1),
  total_amount: z.number().optional(),
  currency: z.string().min(1).optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  valid_until: z.coerce.date().nullable().optional(),
  lines: z.array(offerLineSchema).optional(),
  notes: z.string().nullable().optional(),
});

function grossTotalFromLines(
  lines: {
    quantity: number;
    net_unit_price: number;
    tax_rate: number;
    discount_percent?: number;
  }[],
): number {
  return lines.reduce((sum, l) => {
    const discountedNet = l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
    return sum + l.quantity * discountedNet * (1 + l.tax_rate / 100);
  }, 0);
}

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const includeArchived = searchParams.get("include_archived") === "true";
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (!includeArchived) {
        filter.is_archived = { $ne: true };
      }
      if (q) {
        filter.$or = [
          { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { offer_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await OfferModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const lines = (b.lines ?? []).map((l) => ({
      price_list_item_id: l.price_list_item_id ?? null,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      net_unit_price: l.net_unit_price,
      tax_rate: l.tax_rate,
      discount_percent: l.discount_percent ?? 0,
    }));
    const totalFromLines = lines.length > 0 ? grossTotalFromLines(lines) : null;
    const total_amount =
      totalFromLines !== null ? Math.round(totalFromLines) : (b.total_amount ?? 0);
    if (!total_amount || total_amount <= 0) {
      return NextResponse.json(
        { error: "total_amount required when lines empty" },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const year = new Date().getFullYear();
      const n = await nextCounterValue(actor.tenantId, `offer_${year}`);
      const offer_number = `OFF-${year}-${String(n).padStart(4, "0")}`;
      const public_token = crypto.randomUUID();
      const doc = await OfferModel.create({
        tenantId: actor.tenantId,
        offer_number,
        public_token,
        title: b.title,
        contact_id: b.contact_id,
        total_amount,
        currency: b.currency ?? "HUF",
        status: b.status ?? "draft",
        valid_until: b.valid_until ?? null,
        created_by: actor.actorId,
        lines,
        notes: b.notes ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

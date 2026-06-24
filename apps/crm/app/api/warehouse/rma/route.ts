import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RmaCaseModel,
  PriceListItemModel,
  ContactModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createRmaSchema = z.object({
  price_list_item_id: z.string().min(1),
  serial_number: z.string().nullable().optional(),
  quantity: z.number().positive().default(1),
  contact_id: z.string().min(1),
  supplier_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateRmaSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "received",
    "sent_to_supplier",
    "replaced",
    "repaired",
    "scrapped",
    "returned_to_client",
  ]),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/warehouse/rma
 * Garanciális esetek listázása.
 */
export async function GET(_req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });

    return await withDb(async () => {
      const cases = await RmaCaseModel.find({ tenantId: actor.tenantId })
        .sort({ created_at: -1 })
        .lean();

      // Enrich with product & contact names
      const productIds = cases.map((c) => c.price_list_item_id);
      const contactIds = cases.map((c) => c.contact_id);

      const [products, contacts] = await Promise.all([
        PriceListItemModel.find({
          tenantId: actor.tenantId,
          _id: { $in: productIds },
        }).lean(),
        ContactModel.find({ tenantId: actor.tenantId, _id: { $in: contactIds } }).lean(),
      ]);

      const productMap = new Map(products.map((p) => [String(p._id), p]));
      const contactMap = new Map(contacts.map((c) => [String(c._id), c]));

      const enriched = cases.map((c) => ({
        ...c,
        product: productMap.get(c.price_list_item_id) ?? null,
        contact: contactMap.get(c.contact_id) ?? null,
      }));

      return NextResponse.json(serializeForJson(enriched));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/warehouse/rma
 * Új garanciális eset felvétele.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = createRmaSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      // Check product and contact exist
      const product = await PriceListItemModel.findOne({
        tenantId: actor.tenantId,
        _id: b.price_list_item_id,
      }).lean();
      if (!product) {
        return NextResponse.json({ error: "Termék nem található." }, { status: 400 });
      }

      const contact = await ContactModel.findOne({
        tenantId: actor.tenantId,
        _id: b.contact_id,
      }).lean();
      if (!contact) {
        return NextResponse.json({ error: "Ügyfél nem található." }, { status: 400 });
      }

      const count = await RmaCaseModel.countDocuments({ tenantId: actor.tenantId });
      const rma_number = `RMA-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

      const doc = await RmaCaseModel.create({
        tenantId: actor.tenantId,
        rma_number,
        price_list_item_id: b.price_list_item_id,
        serial_number: b.serial_number ?? null,
        quantity: b.quantity,
        contact_id: b.contact_id,
        supplier_name: b.supplier_name ?? null,
        status: "received",
        notes: b.notes ?? null,
      });

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PATCH /api/warehouse/rma
 * Garanciális eset státuszának módosítása.
 */
export async function PATCH(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = updateRmaSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      const doc = await RmaCaseModel.findOneAndUpdate(
        { tenantId: actor.tenantId, _id: b.id },
        {
          $set: {
            status: b.status,
            ...(b.notes !== undefined && { notes: b.notes }),
          },
        },
        { new: true },
      ).lean();

      if (!doc) {
        return NextResponse.json({ error: "RMA eset nem található." }, { status: 404 });
      }

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

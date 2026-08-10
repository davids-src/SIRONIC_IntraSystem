import { NextResponse } from "next/server";
import { z } from "zod";
import { OfferModel, ProjectModel, PriceListItemModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const bodySchema = z.object({
  project_id: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "write", scope: "global" });
    const { id: offerId } = await params;

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { project_id } = parsed.data;

    return await withDb(async () => {
      // Betöltjük az árajánlatot
      const offer: any = await OfferModel.findOne({
        _id: offerId,
        tenantId: actor.tenantId,
      }).lean();
      if (!offer) {
        return NextResponse.json({ error: "Ajánlat nem található." }, { status: 404 });
      }

      // Betöltjük a projektet
      const project: any = await ProjectModel.findOne({
        _id: project_id,
        tenantId: actor.tenantId,
      }).lean();
      if (!project) {
        return NextResponse.json({ error: "Projekt nem található." }, { status: 404 });
      }

      // Csak a termék-tételeket szűrjük ki (ahol price_list_item_id != null)
      const productLines = (offer.lines ?? []).filter(
        (l: any) => l.price_list_item_id && l.price_list_item_id !== "null",
      );

      if (productLines.length === 0) {
        return NextResponse.json(
          { error: "Az árajánlatban nincsenek termék-tételek." },
          { status: 400 },
        );
      }

      // PriceListItem adatok lekérése a tényleges egység stb. miatt
      const itemIds = productLines.map((l: any) => l.price_list_item_id);
      const priceItems: any[] = await PriceListItemModel.find({
        _id: { $in: itemIds },
        tenantId: actor.tenantId,
      }).lean();
      const itemMap = new Map(priceItems.map((p: any) => [String(p._id), p]));

      // Tételek összeállítása
      const newRequiredItems = productLines.map((l: any) => {
        const priceItem = itemMap.get(String(l.price_list_item_id));
        return {
          price_list_item_id: String(l.price_list_item_id),
          name: priceItem?.name ?? l.description,
          unit: priceItem?.unit ?? l.unit,
          required_quantity: l.quantity,
          reserved_quantity: 0,
        };
      });

      // FELÜLÍRJUK a projekt required_items listáját
      await ProjectModel.updateOne(
        { _id: project_id },
        { $set: { required_items: newRequiredItems } },
      );

      return NextResponse.json({
        success: true,
        imported_count: newRequiredItems.length,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

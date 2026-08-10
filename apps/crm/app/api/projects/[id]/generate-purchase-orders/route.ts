import { NextResponse } from "next/server";
import {
  ProjectModel,
  PriceListItemModel,
  PurchaseOrderModel,
  SupplierModel,
  serializeForJson,
  nextCounterValue,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project", action: "write", scope: "global" });
    const { id: projectId } = await params;

    return await withDb(async () => {
      // Betöltjük a projektet
      const project: any = await ProjectModel.findOne({
        _id: projectId,
        tenantId: actor.tenantId,
      }).lean();
      if (!project) {
        return NextResponse.json({ error: "Projekt nem található." }, { status: 404 });
      }

      const requiredItems: any[] = project.required_items ?? [];
      if (requiredItems.length === 0) {
        return NextResponse.json(
          { error: "A projekt bevásárlólistája üres." },
          { status: 400 },
        );
      }

      // PriceListItem-ek lekérése (preferred_supplier, net_price, unit, tax_rate)
      const itemIds = requiredItems.map((i: any) => i.price_list_item_id);
      const priceItems: any[] = await PriceListItemModel.find({
        _id: { $in: itemIds },
        tenantId: actor.tenantId,
      }).lean();
      const itemMap = new Map(priceItems.map((p: any) => [String(p._id), p]));

      // Szállítók lekérése (névből ID-t keresünk preferred_supplier alapján)
      const suppliers: any[] = await SupplierModel.find({
        tenantId: actor.tenantId,
      }).lean();
      // Szállítónév → supplier _id térkép
      const supplierByName = new Map(
        suppliers.map((s: any) => [s.name.toLowerCase().trim(), s]),
      );

      // Szállítónként csoportosítás
      const groups = new Map<string, { supplierId: string | null; items: any[] }>();
      const NO_SUPPLIER_KEY = "__no_supplier__";

      for (const ri of requiredItems) {
        const priceItem = itemMap.get(String(ri.price_list_item_id));
        const supplierName = priceItem?.preferred_supplier?.trim() ?? "";
        const groupKey = supplierName || NO_SUPPLIER_KEY;

        if (!groups.has(groupKey)) {
          const supplierDoc = supplierName
            ? (supplierByName.get(supplierName.toLowerCase()) ?? null)
            : null;
          groups.set(groupKey, {
            supplierId: supplierDoc ? String(supplierDoc._id) : null,
            items: [],
          });
        }

        groups.get(groupKey)!.items.push({
          price_list_item_id: String(ri.price_list_item_id),
          description: priceItem?.name ?? ri.name,
          quantity: ri.required_quantity,
          unit: priceItem?.unit ?? ri.unit,
          net_unit_price: priceItem?.net_price ?? 0,
          tax_rate: priceItem?.tax_rate ?? 27,
          supplierName: groupKey === NO_SUPPLIER_KEY ? "Nincs szállító" : groupKey,
        });
      }

      // Ha nincs egyetlen supplier_id se (minden "Nincs szállító"), nem tudunk PO-t generálni DB szinten
      // Megrendelőt csak a már rendszerbe felvett szállítókhoz generálunk; a "Nincs szállító" csoportot nem hagyjuk ki
      // – ha nincs hozzárendelt supplier, egy "nincs szállító" nevű placeholder-rel megyünk tovább
      // De a PurchaseOrder.supplier_id kötelező mező – ezért ehhez kell szállító

      // Megrendelők generálása
      const year = new Date().getFullYear();
      const created: any[] = [];

      for (const [groupKey, group] of groups.entries()) {
        // Ha nincs szállítói ID, keresünk egy "Nincs szállító" nevű szállítót,
        // vagy ha nem létezik, kihagyjuk és az eredménybe jelezzük
        let supplierId = group.supplierId;
        if (!supplierId) {
          // Létezik-e "Nincs szállító" nevű szállító?
          const fallback = supplierByName.get("nincs szállító");
          if (fallback) {
            supplierId = String(fallback._id);
          } else {
            // Automatikusan létrehozzuk
            const n = await nextCounterValue(actor.tenantId, "supplier");
            const padded = String(n).padStart(6, "0");
            const newSupplier: any = await SupplierModel.create({
              tenantId: actor.tenantId,
              partner_id: `SU${padded}`,
              name: "Nincs szállító",
              notes:
                "Automatikusan létrehozva – nem meghatározott szállítójú termékekhez",
            });
            supplierId = String(newSupplier._id);
            // Vegyük fel a mappbe is
            supplierByName.set("nincs szállító", newSupplier);
          }
        }

        const n = await nextCounterValue(actor.tenantId, `purchase_order_${year}`);
        const order_number = `PO-${year}-${String(n).padStart(4, "0")}`;

        const total_amount = group.items.reduce(
          (sum: number, l: any) =>
            sum + (l.net_unit_price ?? 0) * l.quantity * (1 + (l.tax_rate ?? 27) / 100),
          0,
        );

        const lines = group.items.map((l: any) => ({
          price_list_item_id: l.price_list_item_id,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          net_unit_price: l.net_unit_price ?? 0,
          tax_rate: l.tax_rate ?? 27,
        }));

        const notes =
          groupKey === NO_SUPPLIER_KEY
            ? "Automatikusan generálva – szállító nincs meghatározva"
            : `Automatikusan generálva a projekt bevásárlólistájából`;

        const doc = await PurchaseOrderModel.create({
          tenantId: actor.tenantId,
          order_number,
          supplier_id: supplierId,
          project_id: projectId,
          offer_id: null,
          status: "draft",
          total_amount,
          currency: "HUF",
          lines,
          notes,
        });
        created.push(serializeForJson(doc.toObject()));
      }

      return NextResponse.json({
        success: true,
        generated_count: created.length,
        purchase_orders: created,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

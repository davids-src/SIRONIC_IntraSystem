import { NextResponse } from "next/server";
import {
  ServicePriceListItemModel,
  PricingSettingsModel,
  ContactModel,
  serializeForJson,
} from "@crm/db";
import { calculateServicePrice, mapContactToMultiplierKey } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_price_list", action: "view", scope: "global" });
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");
    const urgency = searchParams.get("urgency") as
      | "same_day"
      | "after_hours"
      | "weekend"
      | "night"
      | null;

    return await withDb(async () => {
      const item = await ServicePriceListItemModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
        is_archived: false,
      }).lean();
      if (!item) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }

      // Beállítások lekérése
      const settings = await PricingSettingsModel.findOne({
        tenantId: actor.tenantId,
      }).lean();
      if (!settings) {
        return NextResponse.json(
          { error: "Árképzési beállítások nem találhatók" },
          { status: 404 },
        );
      }

      // Partner lekérése (ha van contact_id)
      let contact: any = null;
      if (contact_id) {
        contact = await ContactModel.findOne({
          _id: contact_id,
          tenantId: actor.tenantId,
        }).lean();
      }

      // Ha nincs partner, alapértelmezett (smb_occasional) szorzóval számítunk
      const effectiveContact = contact ?? {
        partner_role: "client",
        client_category: "smb",
        pricing_contract_type: "occasional",
        subcontractor_presence_type: null,
      };

      const result = await calculateServicePrice(
        item as any,
        effectiveContact,
        settings as any,
        {
          urgency: urgency ?? undefined,
        },
      );

      const multiplierKey = mapContactToMultiplierKey(effectiveContact);

      return NextResponse.json(
        serializeForJson({
          ...result,
          multiplier_key: multiplierKey,
          sku: (item as any).sku,
          item_name: (item as any).name,
          contact_name: contact?.name ?? null,
          pricing_settings_captured_at: new Date().toISOString(),
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

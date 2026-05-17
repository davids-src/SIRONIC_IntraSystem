import { NextResponse } from "next/server";
import { OfferModel, ContactModel, SettingsModel, serializeForJson } from "@crm/db";
import { withDb, handleApiError } from "@/lib/api-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    return await withDb(async () => {
      const offer = await OfferModel.findOne({ _id: id, public_token: token }).lean();
      if (!offer) {
        return NextResponse.json(
          { error: "Not found or invalid token" },
          { status: 404 },
        );
      }

      const [contact, settings] = await Promise.all([
        ContactModel.findById((offer as any).contact_id).lean(),
        SettingsModel.findOne({ tenantId: (offer as any).tenantId }).lean(),
      ]);

      return NextResponse.json({
        offer: serializeForJson(offer),
        contact: contact ? serializeForJson(contact) : null,
        provider: (settings as any)?.company_details
          ? serializeForJson((settings as any).company_details)
          : null,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LeadModel,
  ContactModel,
  OfferModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import {
  guard,
  handleApiError,
  requireCrmAuth,
  withDb,
  HttpError,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@crm/lib/server";

const convertSchema = z.object({
  create_offer: z.boolean().optional(),
  offer_title: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { actor, session } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "write", scope: "global" });

    const json: unknown = await req.json().catch(() => ({}));
    const parsed = convertSchema.safeParse(json);

    return await withDb(async () => {
      const lead = await LeadModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!lead) {
        throw new HttpError(404, "Lead not found");
      }

      let contactId = lead.contact_id;

      // 1. If not yet linked to a partner/contact, create new Contact
      if (!contactId) {
        const contactNum = await nextCounterValue(actor.tenantId, "contact");
        const contact = await ContactModel.create({
          tenantId: actor.tenantId,
          name: lead.company_name,
          email: lead.email || null,
          phone: lead.phone || null,
          website: lead.website || null,
          type: "company",
          status: "active",
          tags: ["lead_converted", lead.category || "sales"].filter(Boolean),
          notes: `Létrehozva a(z) ${lead.lead_number} megkeresésből.`,
          created_by: session.user.id,
        });
        contactId = contact._id.toString();
        lead.contact_id = contactId;
      }

      let createdOfferId: string | null = null;
      let offerNumber: string | null = null;

      // 2. Optionally create Offer
      if (parsed.success && parsed.data.create_offer) {
        const n = await nextCounterValue(actor.tenantId, "offer");
        offerNumber = formatNumber("AJ", n);

        const offer = await OfferModel.create({
          tenantId: actor.tenantId,
          offer_number: offerNumber,
          title: parsed.data.offer_title || `${lead.company_name} - Ajánlat`,
          contact_id: contactId,
          total_amount: lead.estimated_value || 0,
          currency: "HUF",
          status: "draft",
          created_by: session.user.id,
          business_unit: lead.business_unit || null,
          lines: [],
        });

        createdOfferId = offer._id.toString();
        lead.offer_id = createdOfferId;
        lead.status = "quotation_needed";
      }

      // Log activity
      lead.activities.push({
        type: "status_change",
        timestamp: new Date(),
        user_id: session.user.id,
        user_name: session.user.name || session.user.email || "Felhasználó",
        text: `Megkeresés partnerként konvertálva${offerNumber ? `, új ajánlat létrehozva: ${offerNumber}` : ""}.`,
      } as any);

      await lead.save();

      await logAuditEvent({
        tenantId: actor.tenantId,
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Felhasználó",
        action: "lead.convert",
        entityType: "lead",
        entityId: id,
        summary: `${lead.company_name} konvertálva partnerként (${contactId})`,
      });

      return NextResponse.json({
        success: true,
        contact_id: contactId,
        offer_id: createdOfferId,
        lead: serializeForJson(lead),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadModel, serializeForJson } from "@crm/db";
import {
  guard,
  handleApiError,
  requireCrmAuth,
  withDb,
  HttpError,
} from "@/lib/api-helpers";
import { logAuditEvent } from "@crm/lib/server";

const addActivitySchema = z.object({
  type: z.enum([
    "call",
    "email",
    "meeting",
    "note",
    "status_change",
    "offer_created",
    "follow_up",
  ]),
  text: z.string().min(1),
  next_action: z.string().nullable().optional(),
  next_action_at: z.coerce.date().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { actor, session } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = addActivitySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const lead = await LeadModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!lead) {
        throw new HttpError(404, "Lead not found");
      }

      const activity = {
        type: parsed.data.type,
        timestamp: new Date(),
        user_id: session.user.id,
        user_name: session.user.name || session.user.email || "Felhasználó",
        text: parsed.data.text,
      };

      lead.activities.push(activity as any);

      if (parsed.data.next_action !== undefined) {
        lead.next_action = parsed.data.next_action;
      }
      if (parsed.data.next_action_at !== undefined) {
        lead.next_action_at = parsed.data.next_action_at;
      }

      await lead.save();

      await logAuditEvent({
        tenantId: actor.tenantId,
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Felhasználó",
        action: "lead.add_activity",
        entityType: "lead",
        entityId: id,
        summary: `Új aktivitás rögzítve a(z) ${lead.company_name} megkeresésnél: ${parsed.data.type}`,
      });

      return NextResponse.json(serializeForJson(lead));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

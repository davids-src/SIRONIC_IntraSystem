import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TicketModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

const bodySchema = z.object({
  message: z.string().min(1),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { tenantId, contactId, portalUserId, actor } = await requirePortalActor();
    guard(actor, { module: "ticket", action: "write", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const message = parsed.data.message.trim();

    return await withDb(async () => {
      const comment = {
        _id: randomUUID(),
        author_id: portalUserId,
        author_role: "partner" as const,
        message,
        is_internal: false,
        created_at: new Date(),
      };
      const doc = await TicketModel.findOneAndUpdate(
        { _id: id, tenantId, contact_id: contactId },
        { $push: { comments: comment } },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

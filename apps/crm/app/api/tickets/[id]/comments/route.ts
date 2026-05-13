import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { TicketModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().min(1),
  is_internal: z.boolean(),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { message, is_internal } = parsed.data;
    if (is_internal) {
      guard(actor, { module: "ticket", action: "internal_comment", scope: "global" });
    } else {
      guard(actor, { module: "ticket", action: "write", scope: "global" });
    }

    return await withDb(async () => {
      const comment = {
        _id: randomUUID(),
        author_id: actor.actorId,
        author_role: "crm_staff" as const,
        message: message.trim(),
        is_internal,
        created_at: new Date(),
      };
      const doc = await TicketModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
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

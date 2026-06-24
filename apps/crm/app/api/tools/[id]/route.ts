import { NextResponse } from "next/server";
import { z } from "zod";
import { ToolModel, ToolTransactionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional().nullable(),
  model_number: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  status: z
    .enum(["in_warehouse", "checked_out", "maintenance", "lost", "retired"])
    .optional(),
  assigned_to: z.string().optional().nullable(),
  condition: z.enum(["new", "good", "fair", "poor"]).optional(),
  notes: z.string().optional().nullable(),
  transactionNotes: z.string().optional().nullable(), // notes specifically for the checkout/checkin log
});

/**
 * GET /api/tools/[id]
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "tools", action: "view", scope: "global" });

    const { id } = await params;

    return await withDb(async () => {
      const tool = await ToolModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!tool) {
        return NextResponse.json({ error: "Szerszám nem található" }, { status: 404 });
      }

      // Also get transaction history
      const transactions = await ToolTransactionModel.find({
        tool_id: id,
        tenantId: actor.tenantId,
      })
        .sort({ created_at: -1 })
        .limit(50)
        .lean();

      return NextResponse.json({
        ...serializeForJson(tool),
        transactions: serializeForJson(transactions),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PATCH /api/tools/[id]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "tools", action: "write", scope: "global" });

    const { id } = await params;
    const json = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;

    return await withDb(async () => {
      const tool = await ToolModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!tool) {
        return NextResponse.json({ error: "Szerszám nem található" }, { status: 404 });
      }

      const prevStatus = tool.status;
      const prevAssigned = tool.assigned_to;

      // Update fields
      if (b.name !== undefined) tool.name = b.name;
      if (b.brand !== undefined) tool.brand = b.brand;
      if (b.model_number !== undefined) tool.model_number = b.model_number;
      if (b.serial_number !== undefined) tool.serial_number = b.serial_number;
      if (b.status !== undefined) tool.status = b.status;
      if (b.assigned_to !== undefined) tool.assigned_to = b.assigned_to;
      if (b.condition !== undefined) tool.condition = b.condition;
      if (b.notes !== undefined) tool.notes = b.notes;

      // Handle transactions logging
      let transType: string | null = null;
      let targetUser: string | null = null;

      // 1. Check out / in detection
      if (b.assigned_to !== undefined && b.assigned_to !== prevAssigned) {
        if (b.assigned_to) {
          transType = "check_out";
          targetUser = b.assigned_to;
          tool.status = "checked_out"; // enforce checked_out status
        } else {
          transType = "check_in";
          tool.status = "in_warehouse"; // enforce in_warehouse status
        }
      }

      // 2. Status change detection (if not already covered by check_out/in)
      if (!transType && b.status !== undefined && b.status !== prevStatus) {
        if (b.status === "maintenance") {
          transType = "maintenance_start";
        } else if (prevStatus === "maintenance" && b.status === "in_warehouse") {
          transType = "maintenance_end";
        } else if (b.status === "lost") {
          transType = "mark_lost";
        } else if (b.status === "retired") {
          transType = "retire";
        }
      }

      await tool.save();

      // Log transaction if detected
      if (transType) {
        await ToolTransactionModel.create({
          tenantId: actor.tenantId,
          tool_id: tool._id,
          actor_id: actor.actorId || "system",
          type: transType,
          target_user_id: targetUser || undefined,
          notes: b.transactionNotes || undefined,
        });
      }

      return NextResponse.json(serializeForJson(tool.toObject()));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/tools/[id]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "tools", action: "admin", scope: "global" });

    const { id } = await params;

    return await withDb(async () => {
      const result = await ToolModel.deleteOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Szerszám nem található" }, { status: 404 });
      }

      // Also clean up transaction history
      await ToolTransactionModel.deleteMany({
        tool_id: id,
        tenantId: actor.tenantId,
      });

      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

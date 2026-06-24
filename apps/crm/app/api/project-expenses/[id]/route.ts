import { NextResponse } from "next/server";
import { ProjectExpenseModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project_expense", action: "write", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const result = await ProjectExpenseModel.deleteOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (result.deletedCount === 0) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

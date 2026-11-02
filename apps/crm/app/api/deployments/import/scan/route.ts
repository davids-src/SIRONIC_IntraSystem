import { NextResponse } from "next/server";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { runImportScan } from "@/lib/deployments/import-scan";

export async function POST() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });

    return await withDb(async () => {
      const result = await runImportScan(actor.tenantId);
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}

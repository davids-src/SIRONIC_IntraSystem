import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel, PartnerDeploymentAccessModel, serializeForJson } from "@crm/db";
import { syncDeploymentAdmins } from "@crm/lib/server";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";
import { setAccessRow, removeAccessRow } from "@/lib/deployment-access";

async function assertOwnDeployment(
  tenantId: string,
  contactId: string,
  deploymentId: string,
) {
  const dep = await DeploymentModel.findOne({
    _id: deploymentId,
    tenantId,
    contact_id: contactId,
  }).lean();
  return dep != null;
}

export async function GET(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get("deployment_id");
    const portalUserId = searchParams.get("portal_user_id");

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId, contact_id: contactId };
      if (deploymentId) filter.deployment_id = deploymentId;
      if (portalUserId) filter.portal_user_id = portalUserId;
      const rows = await PartnerDeploymentAccessModel.find(filter).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const putSchema = z.object({
  portal_user_id: z.string().min(1),
  deployment_id: z.string().min(1),
  access_level: z.enum(["view", "manage"]),
});

export async function PUT(req: Request) {
  try {
    const { tenantId, contactId, portalUserId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      if (!(await assertOwnDeployment(tenantId, contactId, b.deployment_id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await setAccessRow({
        tenantId,
        contactId,
        portalUserId: b.portal_user_id,
        deploymentId: b.deployment_id,
        accessLevel: b.access_level,
        createdBy: portalUserId,
      });
      void syncDeploymentAdmins({ tenantId, deploymentId: b.deployment_id, actor });
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const deleteSchema = z.object({
  portal_user_id: z.string().min(1),
  deployment_id: z.string().min(1),
});

export async function DELETE(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = deleteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      if (!(await assertOwnDeployment(tenantId, contactId, b.deployment_id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await removeAccessRow({
        tenantId,
        portalUserId: b.portal_user_id,
        deploymentId: b.deployment_id,
      });
      void syncDeploymentAdmins({ tenantId, deploymentId: b.deployment_id, actor });
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

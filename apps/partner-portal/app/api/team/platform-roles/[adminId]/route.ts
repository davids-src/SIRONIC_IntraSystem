import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel } from "@crm/db";
import {
  PORTAL_ASSIGNABLE_PLATFORM_ROLES,
  updateDeploymentPlatformRole,
} from "@crm/lib/server";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ adminId: string }> };

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

const PERMISSION_RE = /^[a-z][a-z0-9_-]{0,31}\.(\*|[a-z][a-z0-9_-]{0,31})$/;

const patchSchema = z
  .object({
    deployment_id: z.string().min(1),
    role: z.enum(PORTAL_ASSIGNABLE_PLATFORM_ROLES).optional(),
    permissions: z.array(z.string().regex(PERMISSION_RE)).max(100).optional(),
  })
  .refine((v) => v.role !== undefined || v.permissions !== undefined, {
    message: "role or permissions required",
  });

/** Updates one site admin's platform role/permissions on the partner's own deployed site.
 * `role` is restricted to admin|editor|viewer at the schema level — `owner` can never be
 * requested here — and the site itself rejects any attempt to target an ERP-managed or
 * owner row, atomically inside its own update query, so this never needs to "know" which
 * ids are off-limits. */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { adminId } = await ctx.params;
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      if (!(await assertOwnDeployment(tenantId, contactId, b.deployment_id))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const result = await updateDeploymentPlatformRole({
        tenantId,
        deploymentId: b.deployment_id,
        adminId,
        role: b.role,
        permissions: b.permissions,
      });
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}

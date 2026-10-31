import { PartnerDeploymentAccessModel } from "@crm/db";
import type { PartnerDeploymentAccessLevel } from "@crm/types";

export async function listAccessForDeployment(tenantId: string, deploymentId: string) {
  return PartnerDeploymentAccessModel.find({
    tenantId,
    deployment_id: deploymentId,
  }).lean();
}

export async function listAccessForContact(tenantId: string, contactId: string) {
  return PartnerDeploymentAccessModel.find({ tenantId, contact_id: contactId }).lean();
}

export async function setAccessRow(params: {
  tenantId: string;
  contactId: string;
  portalUserId: string;
  deploymentId: string;
  accessLevel: PartnerDeploymentAccessLevel;
  createdBy: string | null;
}): Promise<void> {
  await PartnerDeploymentAccessModel.updateOne(
    {
      tenantId: params.tenantId,
      portal_user_id: params.portalUserId,
      deployment_id: params.deploymentId,
    },
    {
      $set: {
        contact_id: params.contactId,
        access_level: params.accessLevel,
        created_by: params.createdBy,
      },
    },
    { upsert: true },
  );
}

export async function removeAccessRow(params: {
  tenantId: string;
  portalUserId: string;
  deploymentId: string;
}): Promise<void> {
  await PartnerDeploymentAccessModel.deleteOne({
    tenantId: params.tenantId,
    portal_user_id: params.portalUserId,
    deployment_id: params.deploymentId,
  });
}

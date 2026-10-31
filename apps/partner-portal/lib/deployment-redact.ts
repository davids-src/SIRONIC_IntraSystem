import type {
  Deployment,
  DeploymentStatus,
  DeploymentStepKey,
  DeploymentStepStatus,
} from "@crm/types";

export type PartnerSafeDeploymentStep = {
  key: DeploymentStepKey;
  status: DeploymentStepStatus;
  started_at: Date | null;
  finished_at: Date | null;
};

export type PartnerSafeDeployment = {
  _id: string;
  deployment_number: string;
  name: string;
  domain: string;
  www_redirect: boolean;
  status: DeploymentStatus;
  notes: string | null;
  group_id: string | null;
  package_id: string | null;
  billing_cycle: Deployment["billing_cycle"];
  price_override_huf: number | null;
  next_billing_at: Date | null;
  last_paid_at: Date | null;
  steps: PartnerSafeDeploymentStep[];
  source: "created" | "imported";
  created_at: Date;
  updated_at: Date;
};

/**
 * Strips everything a partner must never see — provider secrets/ids, compose/env,
 * internal billing notes, and admin-sync/provisioning-token internals — before a
 * Deployment doc leaves the partner-portal API.
 */
export function redactDeploymentForPartner(doc: Deployment): PartnerSafeDeployment {
  return {
    _id: doc._id,
    deployment_number: doc.deployment_number,
    name: doc.name,
    domain: doc.domain,
    www_redirect: doc.www_redirect,
    status: doc.status,
    notes: doc.notes,
    group_id: doc.group_id,
    package_id: doc.package_id,
    billing_cycle: doc.billing_cycle,
    price_override_huf: doc.price_override_huf,
    next_billing_at: doc.next_billing_at,
    last_paid_at: doc.last_paid_at,
    steps: doc.steps.map((s) => ({
      key: s.key,
      status: s.status,
      started_at: s.started_at,
      finished_at: s.finished_at,
    })),
    source: doc.source,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

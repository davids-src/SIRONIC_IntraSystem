import type { CrmClient } from "./http-client.js";
import type { DeploymentPackage } from "@crm/types";

export function listDeploymentPackages(client: CrmClient) {
  return client.get<DeploymentPackage[]>("/api/deployment-packages");
}

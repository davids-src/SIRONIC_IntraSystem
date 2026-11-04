import type { CrmClient } from "./http-client.js";
import type { StackTemplate } from "@crm/types";

export function listStackTemplates(client: CrmClient) {
  return client.get<StackTemplate[]>("/api/stack-templates");
}

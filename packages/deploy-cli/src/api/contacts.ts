import type { CrmClient } from "./http-client.js";
import type { Contact } from "@crm/types";

export function searchContacts(client: CrmClient, q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return client.get<Contact[]>(`/api/contacts${qs}`);
}

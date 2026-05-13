import type { RoleKey } from "@crm/types";
import type { SidebarUser } from "@crm/ui";

export function roleKeysToLabel(roleKeys: RoleKey[]): string {
  if (roleKeys.includes("crm.admin")) {
    return "CRM Adminisztrátor";
  }
  if (roleKeys.includes("crm.staff")) {
    return "CRM munkatárs";
  }
  return "Felhasználó";
}

export function toSidebarUser(input: {
  name?: string | null;
  email?: string | null;
  roleKeys: RoleKey[];
}): SidebarUser {
  const name = input.name?.trim() || input.email?.trim() || "Felhasználó";
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
      : name.slice(0, 2).toUpperCase() || "?";
  return {
    name,
    role: roleKeysToLabel(input.roleKeys),
    avatarInitials: initials,
  };
}

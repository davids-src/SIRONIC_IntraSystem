import { requireAnyPermission } from "@erp/auth";

/**
 * Any árlista permission gets you into the module shell — every page and action still gates
 * on its own specific key (docs/05 §5).
 */
export default async function ArlistaLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPermission([
    "arlista:termek:read",
    "arlista:szolgaltatas:read",
    "arlista:beallitas:write",
  ]);
  return <>{children}</>;
}

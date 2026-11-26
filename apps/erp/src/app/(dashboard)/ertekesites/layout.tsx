import { requireAnyPermission } from "@erp/auth";

/** Any értékesítés read permission gets you into the module shell; every page gates itself. */
export default async function ErtekesitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnyPermission([
    "ertekesites:ajanlat:read",
    "ertekesites:szerzodes:read",
    "ertekesites:megrendelo:read",
  ]);
  return <>{children}</>;
}

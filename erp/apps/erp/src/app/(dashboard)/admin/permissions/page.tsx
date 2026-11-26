import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { getPermissionsData } from "./actions";
import { PermissionsManager } from "./permissions-manager";

export default async function PermissionsPage() {
  await requirePermission("roles:manage");
  const data = await getPermissionsData();

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Szerepkörök és jogosultságok</h1>
        <p className="text-muted-foreground text-sm">
          Szerepkörök, a jogaik és a hozzájuk tartozó felhasználók egy helyen.
        </p>
      </div>
      <PermissionsManager
        permissions={data.permissions}
        roles={data.roles}
        users={data.users}
      />
    </Container>
  );
}

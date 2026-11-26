"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  toggleRolePermissionAction,
  createRoleAction,
  deleteRoleAction,
  syncBaselinePermissionsAction,
  setRoleMemberAction,
  type PermissionsFormState,
} from "./actions";
import { Button } from "@erp/ui";
import { Input } from "@erp/ui";
import { Label } from "@erp/ui";
import { Checkbox } from "@erp/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@erp/ui";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@erp/ui";
import { Badge } from "@erp/ui";
import { cn } from "@erp/lib";
import { PermissionGroupSections } from "@/components/admin/permission-group-sections";

type Permission = {
  id: string;
  key: string;
  label: string;
  group: string;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionIds: string[];
  memberIds: string[];
};

type UserOption = { id: string; name: string; email: string; isActive: boolean };

const initialState: PermissionsFormState = { success: false, message: "" };

function PermissionToggle({
  roleId,
  permissionId,
  enabled,
  disabled,
}: {
  roleId: string;
  permissionId: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();

  const handleChange = (checked: boolean) => {
    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("permissionId", permissionId);
    formData.set("enabled", String(checked));

    startTransition(async () => {
      const result = await toggleRolePermissionAction(initialState, formData);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Checkbox
      checked={enabled}
      disabled={disabled}
      onCheckedChange={handleChange}
      aria-label="Toggle permission"
    />
  );
}

/** Who has the role — add or remove people right here, no trip to the user pages. */
function RoleMembers({ role, users }: { role: Role; users: UserOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kereso, setKereso] = useState("");
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const tagok = role.memberIds
    .map((id) => byId.get(id))
    .filter((u): u is UserOption => !!u);
  const jeloltek = useMemo(() => {
    const q = kereso.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          !role.memberIds.includes(u.id) &&
          `${u.name} ${u.email}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [users, role.memberIds, kereso]);

  const set = (userId: string, member: boolean) =>
    startTransition(async () => {
      const r = await setRoleMemberAction(role.id, userId, member);
      if (r.success) {
        toast.success(r.message);
        setKereso("");
        router.refresh();
      } else toast.error(r.message);
    });

  return (
    <div className="mb-4 rounded-md border p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium">
        <UsersIcon className="h-4 w-4" /> Felhasználók ezzel a szerepkörrel (
        {tagok.length})
      </p>
      {tagok.length === 0 ? (
        <p className="text-muted-foreground mb-2 text-xs">Még senkinek nincs meg.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {tagok.map((u) => (
            <li
              key={u.id}
              className={cn(
                "bg-muted inline-flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-xs",
                !u.isActive && "opacity-60",
              )}
            >
              <Link
                href={`/admin/users/${u.id}`}
                className="hover:underline"
                title={u.email}
              >
                {u.name}
                {!u.isActive && " (inaktív)"}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => set(u.id, false)}
                className="hover:bg-foreground/10 rounded-full p-0.5"
                aria-label={`${u.name} eltávolítása`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative max-w-sm">
        <UserPlusIcon className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          value={kereso}
          onChange={(e) => setKereso(e.target.value)}
          placeholder="Felhasználó hozzáadása — név vagy e-mail…"
          className="pl-8"
          aria-label="Felhasználó hozzáadása"
        />
        {jeloltek.length > 0 && (
          <ul className="bg-popover absolute z-10 mt-1 w-full overflow-hidden rounded-md border shadow-md">
            {jeloltek.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => set(u.id, true)}
                  className="hover:bg-accent flex w-full flex-col px-3 py-2 text-left text-sm"
                >
                  {u.name}
                  <span className="text-muted-foreground text-xs">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RolePermissionsCard({
  role,
  groupedPermissions,
  users,
}: {
  role: Role;
  groupedPermissions: Record<string, Permission[]>;
  users: UserOption[];
}) {
  const enabledCount = role.permissionIds.length;
  const locked = role.isSystem && role.key === "admin";

  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-start gap-2 text-left [&[data-state=open]>svg]:rotate-180">
            <ChevronDownIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform" />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {role.name}
                {role.isSystem && <Badge variant="secondary">Rendszer</Badge>}
                <Badge variant="outline" className="font-normal">
                  {enabledCount} jog
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {role.memberIds.length} felhasználó
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {role.description ?? role.key}
                {locked && " — jogosultságok zárolva"}
              </CardDescription>
            </div>
          </CollapsibleTrigger>
          {!role.isSystem && (
            <form
              action={async (formData) => {
                const result = await deleteRoleAction(initialState, formData);
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}
            >
              <input type="hidden" name="roleId" value={role.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Törlés
              </Button>
            </form>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <RoleMembers role={role} users={users} />
            <p className="mb-2 text-sm font-medium">Jogosultságok</p>
            <PermissionGroupSections
              grouped={groupedPermissions}
              defaultOpen={false}
              renderPermission={(perm) => (
                <div
                  key={perm.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b py-2.5 last:border-0"
                >
                  <PermissionToggle
                    roleId={role.id}
                    permissionId={perm.id}
                    enabled={role.permissionIds.includes(perm.id)}
                    disabled={locked}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{perm.label}</p>
                    <p className="text-muted-foreground font-mono text-xs">{perm.key}</p>
                  </div>
                </div>
              )}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function PermissionsManager({
  permissions,
  roles,
  users,
}: {
  permissions: Permission[];
  roles: Role[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(
    createRoleAction,
    initialState,
  );
  const [syncPending, startSync] = useTransition();

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>(
    (acc, perm) => {
      acc[perm.group] = acc[perm.group] ?? [];
      acc[perm.group].push(perm);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-info-border bg-info-soft/50">
        <CardHeader>
          <CardTitle>Hogyan működnek a jogosultságok?</CardTitle>
          <CardDescription className="text-foreground/80 space-y-1">
            <span className="block">
              Egy felhasználó <strong>minden</strong> jogot megkap, amit bármelyik
              szerepköre ad — ezek összeadódnak. Ezen felül a felhasználó adatlapján
              egyenként adhatók <strong>egyedi többletjogok</strong>; ezek is csak
              hozzáadnak, elvenni nem lehet velük.
            </span>
            <span className="block">
              Ajánlott: minden munkakörhöz egy szerepkör (pl. Gépkezelő, HR, Ügyvezető),
              és az embereket itt, a szerepkör kártyáján add hozzá. Ha egy szerepkör
              jogain változtatsz, az mindenkire azonnal érvényes, akinek megvan.
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baseline jogosultságok szinkronizálása</CardTitle>
          <CardDescription>
            Frissíti az összes rendszer jogkulcsot és a rendszer szerepkörök (admin,
            manager, …) jogait a legújabb verzió szerint. Egyedi szerepkörök érintetlenek
            maradnak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="secondary"
            loading={syncPending}
            disabled={syncPending}
            onClick={() => {
              startSync(async () => {
                const result = await syncBaselinePermissionsAction();
                if (result.success) {
                  toast.success(result.message);
                  router.refresh();
                } else {
                  toast.error(result.message);
                }
              });
            }}
          >
            {syncPending ? "Szinkronizálás…" : "Baseline jogosultságok szinkronizálása"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Új szerepkör</CardTitle>
          <CardDescription>Egyedi szerepkör jogosultságokkal</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="flex max-w-2xl flex-col gap-4">
            {createState.success === false && createState.message && (
              <p className="text-destructive text-sm">{createState.message}</p>
            )}
            {createState.success && createState.message && (
              <p className="text-success text-sm">{createState.message}</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="key">Kulcs</Label>
                <Input id="key" name="key" placeholder="sales_rep" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Név</Label>
                <Input id="name" name="name" placeholder="Értékesítő" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Leírás</Label>
              <Input id="description" name="description" placeholder="Opcionális" />
            </div>
            <Button type="submit" loading={createPending} disabled={createPending}>
              {createPending ? "Létrehozás…" : "Szerepkör létrehozása"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={cn("flex flex-col gap-3")}>
        {roles.map((role) => (
          <RolePermissionsCard
            key={role.id}
            role={role}
            groupedPermissions={groupedPermissions}
            users={users}
          />
        ))}
      </div>
    </div>
  );
}

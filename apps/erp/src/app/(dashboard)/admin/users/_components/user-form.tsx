"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, Badge, Checkbox, Separator } from "@erp/ui";
import { PermissionGroupSections } from "@/components/admin/permission-group-sections";
import { createUserAction, updateUserAction, type UserFormState } from "../actions";

type RoleOption = {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  /** Keys the role grants (create / edit forms); used to show where a right comes from. */
  permissionKeys?: string[];
};

type PermissionOption = {
  key: string;
  label: string;
  group: string;
};

type UserFormProps = {
  mode: "create" | "edit";
  roles: RoleOption[];
  permissions: PermissionOption[];
  initial?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roleIds: string[];
    directPermissionKeys: string[];
    isLastActiveAdmin?: boolean;
  };
  currentUserId?: string;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function UserForm({
  mode,
  roles,
  permissions,
  initial,
  currentUserId,
}: UserFormProps) {
  const router = useRouter();
  const bound =
    mode === "create" ? createUserAction : updateUserAction.bind(null, initial!.id);

  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies UserFormState);

  const isSelf = mode === "edit" && initial?.id === currentUserId;
  const lockActive = Boolean(initial?.isLastActiveAdmin) || isSelf;

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      if (mode === "create" && "id" in state && state.id) {
        router.push(`/admin/users/${state.id}`);
      } else {
        router.refresh();
      }
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, mode, router]);

  // Live: which roles are ticked, and which keys they bring — so a direct grant that a role
  // already gives shows as "from role" and is not needed.
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [direct, setDirect] = useState<string[]>(initial?.directPermissionKeys ?? []);
  const rolesByKey = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of roles)
      if (roleIds.includes(r.id))
        for (const k of r.permissionKeys ?? []) m.set(k, [...(m.get(k) ?? []), r.name]);
    return m;
  }, [roles, roleIds]);
  const extra = direct.filter((k) => !rolesByKey.has(k));
  const osszes = new Set([...rolesByKey.keys(), ...direct]).size;

  const groupedPermissions = permissions.reduce<Record<string, PermissionOption[]>>(
    (acc, p) => {
      acc[p.group] = acc[p.group] ?? [];
      acc[p.group].push(p);
      return acc;
    },
    {},
  );

  return (
    <form action={action} className="flex w-full max-w-3xl flex-col gap-8">
      <FormSection title="Fiók adatok" description="Alap belépési adatok.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Név</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email}
              required
              readOnly={mode === "edit" && isSelf}
              disabled={mode === "edit" && isSelf}
              className={mode === "edit" && isSelf ? "bg-muted" : undefined}
            />
            {mode === "edit" && isSelf && (
              <p className="text-muted-foreground text-xs">
                Saját e-mail nem módosítható itt.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-sm">
            <Label htmlFor="password">
              {mode === "create" ? "Jelszó" : "Új jelszó (opcionális)"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={mode === "create"}
              autoComplete="new-password"
              placeholder={mode === "edit" ? "Üresen hagyva nem változik" : undefined}
            />
            {state?.success === false && state.fieldErrors?.password && (
              <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="isActive"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            disabled={lockActive}
            value="true"
          />
          <Label htmlFor="isActive">Aktív felhasználó</Label>
          {lockActive && (
            <span className="text-muted-foreground text-xs">
              {isSelf
                ? "Saját fiók nem inaktiválható."
                : "Az utolsó aktív admin nem inaktiválható."}
            </span>
          )}
        </div>
      </FormSection>

      <Separator />

      <FormSection
        title="Szerepkörök"
        description="A szerepkörök jogosultság-csomagokat adnak."
      >
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/40 text-muted-foreground grid grid-cols-[2.5rem_1fr_6.5rem] items-center gap-2 border-b px-3 py-2 text-xs font-medium">
            <span aria-hidden />
            <span>Név</span>
            <span className="text-right">Típus</span>
          </div>
          <div className="divide-border divide-y">
            {roles.map((role) => {
              const checked = initial?.roleIds.includes(role.id) ?? false;
              const adminLocked =
                initial?.isLastActiveAdmin && role.key === "admin" && checked;
              return (
                <label
                  key={role.id}
                  className="hover:bg-muted/30 grid cursor-pointer grid-cols-[2.5rem_1fr_6.5rem] items-center gap-2 px-3 py-2.5"
                >
                  <Checkbox
                    name="roleIds"
                    value={role.id}
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={(v) =>
                      setRoleIds((ids) =>
                        v
                          ? [...new Set([...ids, role.id])]
                          : ids.filter((i) => i !== role.id),
                      )
                    }
                    disabled={adminLocked}
                    className="justify-self-center"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{role.name}</span>
                    {role.permissionKeys && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {role.permissionKeys.length} jog
                      </span>
                    )}
                  </span>
                  <span className="flex justify-end gap-1">
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        Rendszer
                      </Badge>
                    )}
                    {adminLocked && (
                      <Badge variant="outline" className="text-xs">
                        Kötelező
                      </Badge>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </FormSection>

      <Separator />

      <div className="bg-muted/40 rounded-md border px-4 py-3 text-sm">
        <p className="font-medium">
          Összesen {osszes} jogosultság: {rolesByKey.size} a szerepkörökből
          {extra.length > 0 ? `, ${extra.length} egyedi többlet` : ""}.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          A felhasználó minden jogot megkap, amit bármelyik szerepköre ad, és ezen felül
          azokat, amiket alább egyenként bejelölsz. Egyedi joggal csak hozzáadni lehet,
          elvenni nem — ha valamit egy szerepkör ad, és ennek a felhasználónak nem
          kellene, akkor ne kapja meg azt a szerepkört (vagy készíts neki egy szűkebbet a
          Szerepkörök oldalon).
        </p>
      </div>

      <FormSection
        title="Egyedi többletjogok"
        description="Csak ha a szerepkörökön felül kell még valami. A szerepkörből már meglévő jogok szürkén, pipával látszanak."
      >
        <PermissionGroupSections
          grouped={groupedPermissions}
          defaultOpen={false}
          renderPermission={(perm) => {
            const szerepkorbol = rolesByKey.get(perm.key);
            return (
              <label
                key={perm.key}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-b py-2.5 last:border-0"
              >
                <Checkbox
                  checked={Boolean(szerepkorbol) || direct.includes(perm.key)}
                  disabled={Boolean(szerepkorbol)}
                  onCheckedChange={(v) =>
                    setDirect((d) =>
                      v
                        ? [...new Set([...d, perm.key])]
                        : d.filter((k) => k !== perm.key),
                    )
                  }
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium">{perm.label}</span>
                  <span className="text-muted-foreground block font-mono text-xs">
                    {perm.key}
                  </span>
                </span>
                {szerepkorbol ? (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Szerepkörből: {szerepkorbol.join(", ")}
                  </Badge>
                ) : direct.includes(perm.key) ? (
                  <Badge variant="outline" className="text-xs font-normal">
                    Egyedi
                  </Badge>
                ) : null}
              </label>
            );
          }}
        />
      </FormSection>

      {/* Only the extras are saved as direct grants — a right a role gives needs no copy. */}
      {extra.map((k) => (
        <input key={k} type="hidden" name="directPermissionKeys" value={k} />
      ))}

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {pending ? "Mentés…" : mode === "create" ? "Felhasználó létrehozása" : "Mentés"}
        </Button>
      </div>
    </form>
  );
}

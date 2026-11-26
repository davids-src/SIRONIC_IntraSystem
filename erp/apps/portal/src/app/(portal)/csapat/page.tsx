import Link from "next/link";
import { Input, Label } from "@erp/ui";
import {
  PORTAL_PERMISSIONS,
  PORTAL_ROLE_ADMIN,
  PORTAL_ROLE_VIEWER,
} from "@erp/portal-auth/constants";
import { ActionButton, ActionForm } from "@/components/action-form";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import {
  inviteColleagueAction,
  setColleagueRoleAction,
  toggleColleagueAction,
} from "@/lib/actions";
import { datumIdo } from "@/lib/format";
import { requirePortalPermission } from "@/lib/portal-nezo";
import { portalCsapat } from "@/lib/portal-api";

export const metadata = { title: "Csapat" };

const STATUSZ = {
  aktiv: { label: "Aktív", tone: "success" },
  meghivott: { label: "Meghívva", tone: "info" },
  letiltva: { label: "Letiltva", tone: "danger" },
} as const;

export default async function CsapatPage() {
  const nezo = await requirePortalPermission(PORTAL_PERMISSIONS.usersManage);
  const tagok = await portalCsapat(nezo);
  return (
    <>
      <PageHeader
        title="Csapat"
        description="Munkatársak meghívása és hozzáférésük kezelése a cégén belül."
      />
      <Tabla
        sorok={tagok}
        kulcs={(t) => t.id}
        oszlopok={[
          { fejlec: "Név", cella: (t) => t.name },
          { fejlec: "E-mail", cella: (t) => t.email },
          {
            fejlec: "Állapot",
            cella: (t) => (
              <Allapot label={STATUSZ[t.status].label} tone={STATUSZ[t.status].tone} />
            ),
          },
          { fejlec: "Utolsó belépés", cella: (t) => datumIdo(t.lastLoginAt) },
          {
            fejlec: "Szerepkör",
            cella: (t) => (
              <ActionButton
                action={setColleagueRoleAction}
                fields={{
                  id: t.id,
                  szerepkor: t.rolak.includes(PORTAL_ROLE_ADMIN)
                    ? PORTAL_ROLE_VIEWER
                    : PORTAL_ROLE_ADMIN,
                }}
                label={
                  t.rolak.includes(PORTAL_ROLE_ADMIN)
                    ? "Adminisztrátor → megtekintő"
                    : "Megtekintő → adminisztrátor"
                }
              />
            ),
          },
          {
            fejlec: "Műveletek",
            cella: (t) => (
              <span className="flex flex-wrap items-center gap-2">
                <ActionButton
                  action={toggleColleagueAction}
                  fields={{ id: t.id, aktiv: t.isActive ? "0" : "1" }}
                  label={t.isActive ? "Letiltás" : "Engedélyezés"}
                  variant={t.isActive ? "destructive" : "outline"}
                />
              </span>
            ),
          },
        ]}
      />
      <h2 className="mt-8 mb-3 font-medium">Új munkatárs meghívása</h2>
      <div className="max-w-md">
        <ActionForm action={inviteColleagueAction} submitLabel="Meghívó küldése">
          <div className="flex flex-col gap-1">
            <Label htmlFor="name">Név</Label>
            <Input id="name" name="name" required maxLength={120} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">E-mail cím</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="szerepkor">Szerepkör</Label>
            <select
              id="szerepkor"
              name="szerepkor"
              defaultValue={PORTAL_ROLE_VIEWER}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value={PORTAL_ROLE_VIEWER}>Megtekintő (csak olvasás)</option>
              <option value={PORTAL_ROLE_ADMIN}>Adminisztrátor</option>
            </select>
          </div>
        </ActionForm>
      </div>
    </>
  );
}

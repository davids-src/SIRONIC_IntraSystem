import { notFound } from "next/navigation";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { ActionButton } from "@/components/action-form";
import { PageHeader, Tabla } from "@/components/page";
import { setDeploymentAccessAction } from "@/lib/actions";
import { requirePortalPermission } from "@/lib/portal-nezo";
import { portalCsapattag, portalHozzaferesek, portalTelepitesek } from "@/lib/portal-api";

export const metadata = { title: "Telepítés-hozzáférés" };

/** Which of the partner's deployments a (non-admin) colleague may see. Admins see them all. */
export default async function CsapattagHozzaferesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await requirePortalPermission(PORTAL_PERMISSIONS.accessManage);
  const tag = await portalCsapattag(nezo, id);
  if (!tag) notFound();
  const telepitesek = await portalTelepitesek(nezo);
  const sorok = await Promise.all(
    telepitesek.map(async (t) => {
      const hozz = await portalHozzaferesek(nezo, t.id);
      return { ...t, engedelyezve: hozz.some((h) => h.portalFelhasznaloId === id) };
    }),
  );
  return (
    <>
      <PageHeader
        title={`${tag.name} — telepítés-hozzáférés`}
        description="Jelölje be, mely telepítéseket láthatja a munkatárs. Az adminisztrátorok mindent látnak."
      />
      <Tabla
        sorok={sorok}
        kulcs={(t) => t.id}
        ures="A cégnek nincs telepítése."
        oszlopok={[
          {
            fejlec: "Telepítés",
            cella: (t) => `${t.nev}${t.domain ? ` (${t.domain})` : ""}`,
          },
          { fejlec: "Hozzáférés", cella: (t) => (t.engedelyezve ? "Igen" : "Nem") },
          {
            fejlec: "Művelet",
            cella: (t) => (
              <ActionButton
                action={setDeploymentAccessAction}
                fields={{
                  userId: id,
                  telepitesId: t.id,
                  engedelyezve: t.engedelyezve ? "0" : "1",
                }}
                label={t.engedelyezve ? "Megvonás" : "Engedélyezés"}
              />
            ),
          },
        ]}
      />
    </>
  );
}

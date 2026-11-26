import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { FormPage } from "../../_components/layout";
import { ProjektForm } from "../../_components/projekt-form";

export default async function ProjektSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.projektWrite);
  const projekt = await projektApi.getProjekt(id, { kind: "staff", userId: user.id });
  if (!projekt || projekt.archivalt) notFound();
  const [partnerek, felhasznalok] = await Promise.all([
    partnerApi.listPartnerOptions(),
    projektApi.listFelhasznalok(),
  ]);
  return (
    <FormPage
      title={`${projekt.azonosito} szerkesztése`}
      backHref={`/projekt/${id}`}
      backLabel="Vissza a projekthez"
    >
      <ProjektForm projekt={projekt} partnerek={partnerek} felhasznalok={felhasznalok} />
    </FormPage>
  );
}

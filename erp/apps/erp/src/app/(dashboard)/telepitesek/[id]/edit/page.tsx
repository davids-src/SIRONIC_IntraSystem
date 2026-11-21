import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { partnerApi } from "@erp/partner";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { telepitesErtekek, telepitesSzekciok } from "../../_components/urlap-mezok";
import { updateTelepitesAction } from "../../actions";

export default async function TelepitesSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("deployments:telepites:write");
  const t = await deploymentsApi.getTelepites(id);
  if (!t || t.forras === "nyilvantartas") notFound();
  const [partnerek, sablonok, csomagok] = await Promise.all([
    partnerApi.listPartnerOptions(),
    deploymentsApi.listSablonValaszto(),
    deploymentsApi.listCsomagValaszto(),
  ]);
  return (
    <FormPage
      title={`${t.azonosito} szerkesztése`}
      backHref={`/telepitesek/${id}`}
      backLabel="Vissza az adatlaphoz"
      width="max-w-4xl"
    >
      <MezoForm
        action={updateTelepitesAction.bind(null, id)}
        szekciok={telepitesSzekciok({
          partnerek,
          sablonok,
          csomagok: csomagok.map((c) => ({ id: c.id, nev: c.nev })),
        })}
        ertekek={telepitesErtekek(t)}
        submitLabel="Mentés"
        redirectTo={`/telepitesek/${id}`}
      />
    </FormPage>
  );
}

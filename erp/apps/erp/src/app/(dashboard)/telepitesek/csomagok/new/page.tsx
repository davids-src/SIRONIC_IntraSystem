import { requirePermission } from "@erp/auth";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { CSOMAG_SZEKCIOK } from "../../_components/urlap-mezok";
import { createCsomagAction } from "../../actions";

export default async function UjCsomagPage() {
  await requirePermission("deployments:csomag:write");
  return (
    <FormPage
      title="Új csomag"
      backHref="/telepitesek/csomagok"
      backLabel="Vissza a csomagokhoz"
    >
      <MezoForm
        action={createCsomagAction}
        szekciok={CSOMAG_SZEKCIOK}
        ertekek={{ alapCiklus: "havi", aktiv: true }}
        submitLabel="Csomag létrehozása"
        redirectTo="/telepitesek/csomagok"
      />
    </FormPage>
  );
}

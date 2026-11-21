import { requirePermission } from "@erp/auth";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { SABLON_SZEKCIOK } from "../../_components/urlap-mezok";
import { createSablonAction } from "../../actions";

export default async function UjSablonPage() {
  await requirePermission("deployments:sablon:write");
  return (
    <FormPage title="Új stack sablon" backHref="/telepitesek/sablonok" backLabel="Vissza a sablonokhoz" width="max-w-4xl">
      <MezoForm
        action={createSablonAction}
        szekciok={SABLON_SZEKCIOK}
        ertekek={{ halozatok: "nginxproxy_default" }}
        submitLabel="Sablon létrehozása"
        redirectTo="/telepitesek/sablonok"
      />
    </FormPage>
  );
}

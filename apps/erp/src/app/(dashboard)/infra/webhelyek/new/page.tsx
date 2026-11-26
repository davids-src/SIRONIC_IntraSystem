import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { WEBHELY_TIPUSOK, WEBHELY_TIPUS_LABELS } from "@erp/infra/client";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { ujWebhelyAction } from "../../actions";

export default async function UjWebhelyPage() {
  await requirePermission("infra:webhely:write");
  const partnerek = await partnerApi.listPartnerOptions();
  return (
    <FormPage
      title="Új webhely"
      subtitle="WordPress vagy FTP-s webtárhelyen futó oldal felvétele. A belépéseket a létrehozás után az adatlapon rögzítheted."
      backHref="/infra/webhelyek"
      backLabel="Vissza a webhelyekhez"
    >
      <MezoForm
        action={ujWebhelyAction}
        szekciok={[
          {
            title: "Alapadatok",
            mezok: [
              { name: "nev", label: "Megnevezés", required: true },
              {
                name: "tipus",
                label: "Típus",
                type: "select",
                options: WEBHELY_TIPUSOK.map((t) => ({
                  value: t,
                  label: WEBHELY_TIPUS_LABELS[t],
                })),
              },
              {
                name: "hostnevek",
                label: "Hostnevek",
                required: true,
                wide: true,
                hint: "Vesszővel vagy szóközzel elválasztva; az első a fő cím.",
              },
              {
                name: "partnerId",
                label: "Partner",
                type: "select",
                options: [
                  { value: "", label: "— belső / nincs —" },
                  ...partnerek.map((p) => ({ value: p.id, label: p.nev })),
                ],
              },
              {
                name: "tarhely",
                label: "Tárhely / szolgáltató",
                hint: "Pl. a tárhelyszolgáltató neve vagy a szerver.",
              },
              { name: "lejarat", label: "Tárhely / domain lejárata", type: "date" },
              { name: "megjegyzes", label: "Megjegyzés", wide: true },
            ],
          },
        ]}
        ertekek={{ tipus: "wordpress" }}
        submitLabel="Webhely felvétele"
        redirectTo="/infra/webhelyek/{id}"
      />
    </FormPage>
  );
}

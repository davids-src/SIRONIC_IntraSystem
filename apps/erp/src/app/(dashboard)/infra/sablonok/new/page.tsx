import { requirePermission } from "@erp/auth";
import { STACK_TIPUS_LABELS, STACK_TIPUSOK } from "@erp/infra/client";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { ujSablonAction } from "../../actions";

export default async function UjSablonPage() {
  await requirePermission("infra:sablon:write");
  return (
    <FormPage
      title="Új stack sablon"
      subtitle="Compose fájl és alapértelmezett környezeti változók, amiből később stackek hozhatók létre."
      backHref="/infra/sablonok"
      backLabel="Vissza a sablonokhoz"
      width="max-w-4xl"
    >
      <MezoForm
        action={ujSablonAction}
        szekciok={SABLON_SZEKCIOK}
        ertekek={{ tipus: "projekt" }}
        submitLabel="Sablon létrehozása"
        redirectTo="/infra/sablonok/{id}"
      />
    </FormPage>
  );
}

const SABLON_SZEKCIOK = [
  {
    title: "Alapadatok",
    mezok: [
      { name: "nev", label: "Sablon neve", required: true },
      {
        name: "tipus",
        label: "Alapértelmezett típus",
        type: "select" as const,
        options: STACK_TIPUSOK.map((t) => ({ value: t, label: STACK_TIPUS_LABELS[t] })),
      },
      { name: "leiras", label: "Leírás", wide: true },
    ],
  },
  {
    title: "Compose fájl",
    description:
      "A konténereknek az nginxproxy_default hálózaton kell lenniük, hogy az NPM elérje őket.",
    mezok: [
      {
        name: "compose",
        label: "docker-compose.yml",
        type: "textarea" as const,
        rows: 18,
        wide: true,
        required: true,
      },
    ],
  },
  {
    title: "Alapértelmezett környezeti változók",
    description:
      "NEV=érték soronként. Valódi titkokat ne tegyél ide: a sablon értékei nem titkosítottak.",
    mezok: [
      { name: "env", label: "Változók", type: "textarea" as const, rows: 5, wide: true },
    ],
  },
];

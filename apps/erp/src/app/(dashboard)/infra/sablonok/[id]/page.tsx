import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { STACK_TIPUS_LABELS, STACK_TIPUSOK, envSzovegge } from "@erp/infra/client";
import { infraApi } from "@erp/infra";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { DangerZone } from "../../../eszkoz/_components/detail/detail-layout";
import { MezoForm } from "../../_components/mezo-form";
import { SablonTorles } from "../../_components/muveletek";
import { modositSablonAction } from "../../actions";

export default async function SablonAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("infra:sablon:read");
  const [irhat, torolhet, s] = await Promise.all([
    hasPermission("infra:sablon:write"),
    hasPermission("infra:sablon:delete"),
    infraApi.getSablon(id),
  ]);
  if (!s) notFound();
  return (
    <FormPage
      title={s.nev}
      subtitle={irhat ? "Sablon szerkesztése" : "Sablon (csak olvasható)"}
      backHref="/infra/sablonok"
      backLabel="Vissza a sablonokhoz"
      width="max-w-4xl"
    >
      {irhat ? (
        <MezoForm
          action={modositSablonAction.bind(null, id)}
          szekciok={[
            {
              title: "Alapadatok",
              mezok: [
                { name: "nev", label: "Sablon neve", required: true },
                {
                  name: "tipus",
                  label: "Alapértelmezett típus",
                  type: "select",
                  options: STACK_TIPUSOK.map((t) => ({
                    value: t,
                    label: STACK_TIPUS_LABELS[t],
                  })),
                },
                { name: "leiras", label: "Leírás", wide: true },
              ],
            },
            {
              title: "Compose fájl",
              mezok: [
                {
                  name: "compose",
                  label: "docker-compose.yml",
                  type: "textarea",
                  rows: 18,
                  wide: true,
                  required: true,
                },
              ],
            },
            {
              title: "Alapértelmezett környezeti változók",
              description: "NEV=érték soronként. Valódi titkokat ne tegyél ide.",
              mezok: [
                { name: "env", label: "Változók", type: "textarea", rows: 5, wide: true },
              ],
            },
          ]}
          ertekek={{
            nev: s.nev,
            tipus: s.tipus,
            leiras: s.leiras,
            compose: s.compose,
            env: envSzovegge(s.env),
          }}
          submitLabel="Mentés"
          redirectTo={`/infra/sablonok/${id}`}
        />
      ) : (
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{s.compose}</pre>
      )}
      {torolhet && (
        <DangerZone>
          <SablonTorles id={id} nev={s.nev} />
        </DangerZone>
      )}
    </FormPage>
  );
}

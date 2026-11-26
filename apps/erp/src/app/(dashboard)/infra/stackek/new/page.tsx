import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { STACK_TIPUS_LABELS, STACK_TIPUSOK, envSzovegge, infraApi } from "@erp/infra";
import { hasPermission } from "@erp/auth";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { SablonValasztek } from "../../_components/muveletek";
import { ujStackAction } from "../../actions";

const COMPOSE_MINTA = `services:
  web:
    image: ghcr.io/szervezet/alkalmazas:main
    container_name: alkalmazas_web
    restart: unless-stopped
    networks:
      - default
      - nginxproxy_default

networks:
  default:
    driver: bridge
  nginxproxy_default:
    external: true
`;

export default async function UjStackPage({
  searchParams,
}: {
  searchParams: Promise<{ sablon?: string }>;
}) {
  await requirePermission("infra:stack:write");
  const { sablon } = await searchParams;
  const sablonOlvas = await hasPermission("infra:sablon:read");
  const [partnerek, sablonok, kivalasztott] = await Promise.all([
    partnerApi.listPartnerOptions(),
    sablonOlvas ? infraApi.listSablonok() : Promise.resolve([]),
    sablonOlvas && sablon ? infraApi.getSablon(sablon) : Promise.resolve(null),
  ]);
  return (
    <FormPage
      title="Új stack"
      subtitle="Létrehozza és elindítja a stacket a Portaineren. Egy stackbe több service (image) is mehet."
      backHref="/infra/stackek"
      backLabel="Vissza a stackekhez"
      width="max-w-4xl"
    >
      {sablonOlvas && sablonok.length > 0 && (
        <SablonValasztek sablonok={sablonok} kivalasztott={kivalasztott?.id} />
      )}
      <MezoForm
        key={kivalasztott?.id ?? "ures"}
        action={ujStackAction}
        szekciok={[
          {
            title: "Alapadatok",
            mezok: [
              {
                name: "nev",
                label: "Stack neve",
                required: true,
                hint: "Kisbetű, szám, kötőjel, alávonás (ez lesz a Portainer stack neve).",
              },
              {
                name: "tipus",
                label: "Típus",
                type: "select",
                options: STACK_TIPUSOK.map((t) => ({
                  value: t,
                  label: STACK_TIPUS_LABELS[t],
                })),
              },
              {
                name: "partnerId",
                label: "Partner",
                type: "select",
                options: [
                  { value: "", label: "— nincs —" },
                  ...partnerek.map((p) => ({ value: p.id, label: p.nev })),
                ],
              },
              { name: "leiras", label: "Megjegyzés" },
            ],
          },
          {
            title: "Compose fájl",
            description:
              "Az oldalak (domainek) a stack létrehozása után az Oldalak menüben köthetők a service-ekhez. A konténereknek az nginxproxy_default hálózaton kell lenniük.",
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
            title: "Környezeti változók",
            mezok: [
              {
                name: "env",
                label: "NEV=érték soronként",
                type: "textarea",
                rows: 5,
                wide: true,
              },
            ],
          },
        ]}
        ertekek={{
          tipus: kivalasztott?.tipus ?? "projekt",
          compose: kivalasztott?.compose ?? COMPOSE_MINTA,
          env: kivalasztott ? envSzovegge(kivalasztott.env) : "",
          leiras: kivalasztott?.leiras,
        }}
        submitLabel="Stack létrehozása és indítása"
        redirectTo="/infra/stackek/{id}"
      />
    </FormPage>
  );
}

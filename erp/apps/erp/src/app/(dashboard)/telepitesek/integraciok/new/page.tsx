import { requirePermission } from "@erp/auth";
import { INTEGRACIO_LABELS, INTEGRACIO_SZOLGALTATOK, type IntegracioSzolgaltato } from "@erp/deployments";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { MezoForm } from "../../_components/mezo-form";
import { integracioSzekciok } from "../../_components/urlap-mezok";
import { createIntegracioAction } from "../../actions";

const ALAP_URL: Record<IntegracioSzolgaltato, string> = {
  cloudflare: "https://api.cloudflare.com/client/v4",
  npm: "",
  portainer: "",
  github: "https://api.github.com",
};

export default async function UjIntegracioPage({
  searchParams,
}: {
  searchParams: Promise<{ szolgaltato?: string }>;
}) {
  await requirePermission("deployments:integracio:write");
  const { szolgaltato: sz } = await searchParams;
  const szolgaltato = (INTEGRACIO_SZOLGALTATOK as readonly string[]).includes(sz ?? "")
    ? (sz as IntegracioSzolgaltato)
    : "cloudflare";
  return (
    <FormPage
      title={`Új kapcsolat: ${INTEGRACIO_LABELS[szolgaltato]}`}
      backHref="/telepitesek/integraciok"
      backLabel="Vissza az integrációkhoz"
    >
      <MezoForm
        action={createIntegracioAction}
        szekciok={integracioSzekciok(szolgaltato, false)}
        ertekek={{ szolgaltato, alapUrl: ALAP_URL[szolgaltato], aktiv: true }}
        submitLabel="Kapcsolat mentése"
        redirectTo="/telepitesek/integraciok"
      />
    </FormPage>
  );
}

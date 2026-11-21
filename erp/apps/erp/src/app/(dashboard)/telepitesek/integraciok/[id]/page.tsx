import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { ConfirmDeleteButton } from "../../../eszkoz/_components/confirm-delete-button";
import { MezoForm } from "../../_components/mezo-form";
import { integracioSzekciok } from "../../_components/urlap-mezok";
import { deleteIntegracioAction, updateIntegracioAction } from "../../actions";

export default async function IntegracioSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("deployments:integracio:write");
  const k = await deploymentsApi.getIntegracio(id);
  if (!k) notFound();
  const canDelete = await hasPermission("deployments:integracio:delete");
  return (
    <FormPage
      title={`Kapcsolat: ${k.cimke}`}
      subtitle={`Tárolt hitelesítő mezők: ${k.hitelesitoMezok.join(", ") || "—"} (az értékek nem láthatók)`}
      backHref="/telepitesek/integraciok"
      backLabel="Vissza az integrációkhoz"
    >
      <MezoForm
        action={updateIntegracioAction.bind(null, id)}
        szekciok={integracioSzekciok(k.szolgaltato, true)}
        ertekek={{
          szolgaltato: k.szolgaltato,
          cimke: k.cimke,
          alapUrl: k.alapUrl,
          aktiv: k.aktiv,
          allowInsecureTls: k.allowInsecureTls,
          accountId: k.accountId,
          endpointId: k.endpointId,
        }}
        submitLabel="Mentés"
        redirectTo="/telepitesek/integraciok"
      />
      {canDelete && (
        <div>
          <ConfirmDeleteButton
            onDelete={deleteIntegracioAction.bind(null, id)}
            title="Kapcsolat törlése"
            description="A törlés után a lépések nem tudnak ezen a kapcsolaton át futni."
            redirectTo="/telepitesek/integraciok"
          />
        </div>
      )}
    </FormPage>
  );
}

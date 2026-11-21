import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { ConfirmDeleteButton } from "../../../eszkoz/_components/confirm-delete-button";
import { MezoForm } from "../../_components/mezo-form";
import { CSOMAG_SZEKCIOK } from "../../_components/urlap-mezok";
import { deleteCsomagAction, updateCsomagAction } from "../../actions";

export default async function CsomagSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("deployments:csomag:write");
  const c = await deploymentsApi.getCsomag(id);
  if (!c) notFound();
  const canDelete = await hasPermission("deployments:csomag:delete");
  return (
    <FormPage
      title={`Csomag: ${c.nev}`}
      backHref="/telepitesek/csomagok"
      backLabel="Vissza a csomagokhoz"
    >
      <MezoForm
        action={updateCsomagAction.bind(null, id)}
        szekciok={CSOMAG_SZEKCIOK}
        ertekek={{ ...c }}
        submitLabel="Mentés"
        redirectTo="/telepitesek/csomagok"
      />
      {canDelete && (
        <div>
          <ConfirmDeleteButton
            onDelete={deleteCsomagAction.bind(null, id)}
            title="Csomag törlése"
            description="Csak olyan csomag törölhető, amelyet nem használ telepítés."
            redirectTo="/telepitesek/csomagok"
          />
        </div>
      )}
    </FormPage>
  );
}

import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { ArchivGombok } from "../../_components/kozos";
import { KoltsegForm } from "../../_components/koltseg-form";
import { ConfirmDeleteButton, DangerZone, FormPage } from "../../_components/layout";
import {
  archiveKoltsegAction,
  deleteKoltsegAction,
  restoreKoltsegAction,
} from "../../actions";

export default async function KoltsegSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.koltsegWrite);
  const koltseg = await projektApi.getKoltseg(id, { kind: "staff", userId: user.id });
  if (!koltseg) notFound();
  const [projektek, canDelete] = await Promise.all([
    projektApi.listProjektOpciok(),
    hasPermission(P.koltsegDelete),
  ]);
  return (
    <FormPage
      title="Költség szerkesztése"
      backHref={`/projekt/koltsegek?projektId=${koltseg.projektId}`}
      backLabel="Vissza a költségekhez"
    >
      <ArchivGombok
        alany="költség"
        archivalt={koltseg.archivalt}
        onArchive={archiveKoltsegAction.bind(null, koltseg._id)}
        onRestore={restoreKoltsegAction.bind(null, koltseg._id)}
      />
      {!koltseg.archivalt && <KoltsegForm koltseg={koltseg} projektek={projektek} />}
      {canDelete && (
        <DangerZone description="A törlés nem vonható vissza — inkább archiváld.">
          <ConfirmDeleteButton
            onDelete={deleteKoltsegAction.bind(null, koltseg._id)}
            title="Költség törlése"
            description="A költség véglegesen törlődik."
            redirectTo={`/projekt/koltsegek?projektId=${koltseg.projektId}`}
          />
        </DangerZone>
      )}
    </FormPage>
  );
}

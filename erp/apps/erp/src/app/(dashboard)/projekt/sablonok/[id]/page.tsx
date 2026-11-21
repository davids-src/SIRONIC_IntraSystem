import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { projektApi } from "@erp/projekt";
import { PROJEKT_PERMISSIONS as P } from "@erp/projekt/client";
import { ArchivGombok } from "../../_components/kozos";
import { ConfirmDeleteButton, DangerZone, FormPage } from "../../_components/layout";
import { SablonForm } from "../../_components/sablon-form";
import {
  archiveSablonAction,
  deleteSablonAction,
  restoreSablonAction,
} from "../../actions";

export default async function SablonSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.sablonWrite);
  const sablon = await projektApi.getSablon(id);
  if (!sablon) notFound();
  const canDelete = await hasPermission(P.sablonDelete);
  return (
    <FormPage
      title={`${sablon.nev} szerkesztése`}
      backHref="/projekt/sablonok"
      backLabel="Vissza a sablonokhoz"
    >
      <ArchivGombok
        alany="sablon"
        archivalt={sablon.archivalt}
        ok={sablon.archivalasOka}
        onArchive={archiveSablonAction.bind(null, sablon.id)}
        onRestore={restoreSablonAction.bind(null, sablon.id)}
      />
      {!sablon.archivalt && <SablonForm sablon={sablon} />}
      {canDelete && (
        <DangerZone description="A törlés nem vonható vissza — a már projektre alkalmazott tételek megmaradnak.">
          <ConfirmDeleteButton
            onDelete={deleteSablonAction.bind(null, sablon.id)}
            title={`${sablon.nev} törlése`}
            description="A sablon véglegesen törlődik."
            redirectTo="/projekt/sablonok"
          />
        </DangerZone>
      )}
    </FormPage>
  );
}

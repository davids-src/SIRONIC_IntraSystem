import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { deploymentsApi } from "@erp/deployments";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { ConfirmDeleteButton } from "../../../eszkoz/_components/confirm-delete-button";
import { MezoForm } from "../../_components/mezo-form";
import { SABLON_SZEKCIOK } from "../../_components/urlap-mezok";
import { deleteSablonAction, updateSablonAction } from "../../actions";

export default async function SablonSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("deployments:sablon:write");
  const s = await deploymentsApi.getSablon(id);
  if (!s) notFound();
  const canDelete = await hasPermission("deployments:sablon:delete");
  return (
    <FormPage title={`Sablon: ${s.nev}`} backHref="/telepitesek/sablonok" backLabel="Vissza a sablonokhoz" width="max-w-4xl">
      <MezoForm
        action={updateSablonAction.bind(null, id)}
        szekciok={SABLON_SZEKCIOK}
        ertekek={{
          nev: s.nev,
          leiras: s.leiras,
          alapertelmezett: s.alapertelmezett,
          composeYaml: s.composeYaml,
          helyorzok: s.helyorzok
            .map((h) => [h.kulcs, h.cimke, h.kotelezo ? "i" : "n", h.titkos ? "i" : "n", h.alapertek ?? ""].join("|"))
            .join("\n"),
          halozatok: s.szuksegesHalozatok.join(" "),
        }}
        submitLabel="Mentés"
        redirectTo="/telepitesek/sablonok"
      />
      {canDelete && (
        <div>
          <ConfirmDeleteButton
            onDelete={deleteSablonAction.bind(null, id)}
            title="Sablon törlése"
            description="Csak olyan sablon törölhető, amelyet nem használ telepítés."
            redirectTo="/telepitesek/sablonok"
          />
        </div>
      )}
    </FormPage>
  );
}

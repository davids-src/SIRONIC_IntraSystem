import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { eszkozApi } from "@erp/eszkoz";
import { FormPage } from "../../_components/form/form-layout";
import { EszkozForm } from "../../_components/eszkoz-form";

export default async function EszkozSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission("eszkoz:eszkoz:write");
  const eszkoz = await eszkozApi.getEszkoz(id);
  if (!eszkoz) notFound();
  if (eszkoz.allapot === "kivonva") redirect(`/eszkoz/${id}`);

  return (
    <FormPage
      title={`${eszkoz.megnevezes} szerkesztése`}
      subtitle="Az eszköz alapadatai. Az állapot és a birtokos csak kiadással, visszavétellel stb. változik."
      backHref={`/eszkoz/${id}`}
      backLabel="Vissza az adatlaphoz"
    >
      <EszkozForm eszkoz={eszkoz} />
    </FormPage>
  );
}

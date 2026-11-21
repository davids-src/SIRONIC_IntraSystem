import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { SablonForm } from "../../../_components/sablon-form";

export default async function SablonSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.szerzodesWrite);
  const sablon = await ertekesitesApi.getSablon(id);
  if (!sablon) notFound();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${sablon.nev} szerkesztése`} />
      <SablonForm sablon={sablon} />
    </Container>
  );
}

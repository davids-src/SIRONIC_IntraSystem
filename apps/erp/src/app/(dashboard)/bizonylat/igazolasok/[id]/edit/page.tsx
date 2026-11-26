import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltImportForrasok, betoltPartnerOpciok } from "@/lib/bizonylat-loaders";
import { IgazolasForm } from "../../../_components/igazolas-form";

export default async function IgazolasSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.igazolasWrite);
  const d = await bizonylatApi.getIgazolas(id, {
    kind: "staff",
    userId: user.id,
    belsoLathato: true,
  });
  if (!d) notFound();
  if (d.allapot !== "piszkozat" || d.archivalt) redirect(`/bizonylat/igazolasok/${id}`);
  const [partnerek, forrasok] = await Promise.all([
    betoltPartnerOpciok(),
    betoltImportForrasok({ userId: user.id, permissions: user.permissions }),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${d.azonosito} szerkesztése`} />
      <IgazolasForm igazolas={d} partnerek={partnerek} forrasok={forrasok} belsoLathato />
    </Container>
  );
}

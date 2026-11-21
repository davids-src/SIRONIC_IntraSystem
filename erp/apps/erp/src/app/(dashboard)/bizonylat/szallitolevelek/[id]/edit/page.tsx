import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok } from "@/lib/ertekesites-loaders";
import { betoltPartnerOpciok } from "@/lib/bizonylat-loaders";
import { SzallitolevelForm } from "../../../_components/szallitolevel-form";

export default async function SzallitolevelSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.szallitolevelWrite);
  const d = await bizonylatApi.getSzallitolevel(id);
  if (!d) notFound();
  if (d.allapot !== "piszkozat" || d.archivalt)
    redirect(`/bizonylat/szallitolevelek/${id}`);
  const [partnerek, termekek] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      { termek: user.permissions.includes("arlista:termek:read"), szolgaltatas: false },
    ),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${d.azonosito} szerkesztése`} />
      <SzallitolevelForm szallitolevel={d} partnerek={partnerek} termekek={termekek} />
    </Container>
  );
}

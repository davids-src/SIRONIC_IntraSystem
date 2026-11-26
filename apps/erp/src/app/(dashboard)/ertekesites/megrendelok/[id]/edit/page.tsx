import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { MegrendeloForm } from "../../../_components/megrendelo-form";

export default async function MegrendeloSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.megrendeloWrite);
  const m = await ertekesitesApi.getMegrendelo(id);
  if (!m) notFound();
  if (m.allapot !== "piszkozat" || m.archivalt)
    redirect(`/ertekesites/megrendelok/${id}`);
  const [partnerek, arlista] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      { termek: user.permissions.includes("arlista:termek:read"), szolgaltatas: false },
    ),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${m.azonosito} szerkesztése`} />
      <MegrendeloForm megrendelo={m} partnerek={partnerek} termekek={arlista} />
    </Container>
  );
}

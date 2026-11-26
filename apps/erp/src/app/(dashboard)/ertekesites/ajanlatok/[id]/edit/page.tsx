import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { AjanlatForm } from "../../../_components/ajanlat-form";

export default async function AjanlatSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.ajanlatWrite);
  const viewer = { userId: user.id, permissions: user.permissions };
  const ajanlat = await ertekesitesApi.getAjanlat(viewer, id);
  if (!ajanlat) notFound();
  // Draft-only editing: the facade enforces it; the page just sends everyone else back.
  if (ajanlat.allapot !== "piszkozat" || ajanlat.archivalt)
    redirect(`/ertekesites/ajanlatok/${id}`);
  const [partnerek, arlista] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(viewer, {
      termek: user.permissions.includes("arlista:termek:read"),
      szolgaltatas: user.permissions.includes("arlista:szolgaltatas:read"),
    }),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${ajanlat.azonosito} szerkesztése`} />
      <AjanlatForm ajanlat={ajanlat} partnerek={partnerek} arlista={arlista} />
    </Container>
  );
}

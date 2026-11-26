import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { SzerzodesForm } from "../../../_components/szerzodes-form";

export default async function SzerzodesSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.szerzodesWrite);
  const szerzodes = await ertekesitesApi.getSzerzodes(id);
  if (!szerzodes) notFound();
  if (szerzodes.allapot !== "piszkozat") redirect(`/ertekesites/szerzodesek/${id}`);
  const [partnerek, sablonok] = await Promise.all([
    betoltPartnerOpciok(),
    ertekesitesApi.listSablonok(),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${szerzodes.azonosito} szerkesztése`} />
      <SzerzodesForm
        szerzodes={szerzodes}
        partnerek={partnerek}
        sablonok={sablonok}
        sablonSzoveg={szerzodes.sablonSzoveg}
      />
    </Container>
  );
}

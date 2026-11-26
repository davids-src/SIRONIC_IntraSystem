import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { SzerzodesForm } from "../../_components/szerzodes-form";

export default async function UjSzerzodesPage() {
  await requirePermission(P.szerzodesWrite);
  const [partnerek, sablonok] = await Promise.all([
    betoltPartnerOpciok(),
    ertekesitesApi.listSablonok({ csakAktiv: true }),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új szerződés" />
      <SzerzodesForm partnerek={partnerek} sablonok={sablonok} />
    </Container>
  );
}

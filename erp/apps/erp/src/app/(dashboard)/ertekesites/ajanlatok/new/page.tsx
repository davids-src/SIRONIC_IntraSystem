import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { AjanlatForm } from "../../_components/ajanlat-form";

export default async function UjAjanlatPage() {
  const user = await requirePermission(P.ajanlatWrite);
  const [partnerek, arlista] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      {
        termek: user.permissions.includes("arlista:termek:read"),
        szolgaltatas: user.permissions.includes("arlista:szolgaltatas:read"),
      },
    ),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új ajánlat" subtitle="Fejléc, partner, tételek, kedvezmény." />
      <AjanlatForm partnerek={partnerek} arlista={arlista} />
    </Container>
  );
}

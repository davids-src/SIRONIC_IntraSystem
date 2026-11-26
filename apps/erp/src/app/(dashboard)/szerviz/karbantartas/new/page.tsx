import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltPartnerOpciok } from "@/lib/szerviz-loaders";
import { KarbantartasForm } from "../../_components/karbantartas-form";

export default async function UjKarbantartasPage() {
  await requirePermission(P.karbantartasWrite);
  const [partnerek, felhasznalok] = await Promise.all([
    betoltPartnerOpciok(),
    szervizApi.listFelhasznalok(),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új karbantartási terv" />
      <KarbantartasForm partnerek={partnerek} felhasznalok={felhasznalok} />
    </Container>
  );
}

import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltImportForrasok, betoltPartnerOpciok } from "@/lib/bizonylat-loaders";
import { IgazolasForm } from "../../_components/igazolas-form";

export default async function UjIgazolasPage() {
  const user = await requirePermission(P.igazolasWrite);
  const [partnerek, forrasok] = await Promise.all([
    betoltPartnerOpciok(),
    betoltImportForrasok({ userId: user.id, permissions: user.permissions }),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új teljesítésigazolás" />
      <IgazolasForm partnerek={partnerek} forrasok={forrasok} belsoLathato />
    </Container>
  );
}

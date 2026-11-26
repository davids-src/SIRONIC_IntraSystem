import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok } from "@/lib/ertekesites-loaders";
import { betoltPartnerOpciok } from "@/lib/bizonylat-loaders";
import { JotallasForm } from "../../_components/jotallas-form";

export default async function UjJotallasPage() {
  const user = await requirePermission(P.jotallasWrite);
  const [partnerek, termekek] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      { termek: user.permissions.includes("arlista:termek:read"), szolgaltatas: false },
    ),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új jótállási jegy" />
      <JotallasForm partnerek={partnerek} termekek={termekek} />
    </Container>
  );
}

import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/ertekesites-loaders";
import { MegrendeloForm } from "../../_components/megrendelo-form";

export default async function UjMegrendeloPage() {
  const user = await requirePermission(P.megrendeloWrite);
  const [partnerek, arlista] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      { termek: user.permissions.includes("arlista:termek:read"), szolgaltatas: false },
    ),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új megrendelőlap" />
      <MegrendeloForm partnerek={partnerek} termekek={arlista} />
    </Container>
  );
}

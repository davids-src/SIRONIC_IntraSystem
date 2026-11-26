import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltPartnerOpciok } from "@/lib/szerviz-loaders";
import { HibajegyForm } from "../../_components/hibajegy-form";

export default async function UjHibajegyPage() {
  const user = await requirePermission(P.hibajegyWrite);
  const [partnerek, felhasznalok, projektek] = await Promise.all([
    betoltPartnerOpciok(),
    szervizApi.listFelhasznalok(),
    projektApi.listProjektOpciok(),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új hibajegy" />
      <HibajegyForm
        partnerek={partnerek}
        felhasznalok={felhasznalok}
        projektek={projektek}
        belsoJegyzetSzerkesztheto={user.permissions.includes(P.hibajegyBelso)}
      />
    </Container>
  );
}

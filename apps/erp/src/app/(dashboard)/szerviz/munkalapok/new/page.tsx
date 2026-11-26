import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/szerviz-loaders";
import { MunkalapForm } from "../../_components/munkalap-form";

export default async function UjMunkalapPage({
  searchParams,
}: {
  searchParams: Promise<{ hibajegyId?: string; partnerId?: string }>;
}) {
  const user = await requirePermission(P.munkalapWrite);
  const sp = await searchParams;
  const [partnerek, arlista, projektek, hibajegyek] = await Promise.all([
    betoltPartnerOpciok(),
    betoltArlistaValasztok(
      { userId: user.id, permissions: user.permissions },
      {
        termek: user.permissions.includes("arlista:termek:read"),
        szolgaltatas: user.permissions.includes("arlista:szolgaltatas:read"),
      },
    ),
    projektApi.listProjektOpciok(),
    szervizApi.listHibajegyOpciok(),
  ]);
  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új munkalap" />
      <MunkalapForm
        elozetes={{ hibajegyId: sp.hibajegyId, partnerId: sp.partnerId }}
        partnerek={partnerek}
        arlista={arlista}
        projektek={projektek}
        hibajegyek={hibajegyek}
        szereloNev={user.name}
      />
    </Container>
  );
}

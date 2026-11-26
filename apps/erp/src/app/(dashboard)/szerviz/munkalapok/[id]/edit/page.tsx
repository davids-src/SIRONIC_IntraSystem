import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltArlistaValasztok, betoltPartnerOpciok } from "@/lib/szerviz-loaders";
import { MunkalapForm } from "../../../_components/munkalap-form";

export default async function MunkalapSzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.munkalapWrite);
  const m = await szervizApi.getMunkalap(id, { kind: "staff", userId: user.id });
  if (!m) notFound();
  // Draft-only editing: the page redirects, the facade enforces it.
  if (m.allapot !== "piszkozat" || m.archivalt) redirect(`/szerviz/munkalapok/${id}`);
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
      <PageHeader title={`${m.azonosito} szerkesztése`} />
      <MunkalapForm
        munkalap={m}
        partnerek={partnerek}
        arlista={arlista}
        projektek={projektek}
        hibajegyek={hibajegyek}
        szereloNev={user.name}
      />
    </Container>
  );
}

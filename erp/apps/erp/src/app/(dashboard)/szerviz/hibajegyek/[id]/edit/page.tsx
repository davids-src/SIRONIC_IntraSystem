import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { betoltPartnerOpciok } from "@/lib/szerviz-loaders";
import { HibajegyForm } from "../../../_components/hibajegy-form";

export default async function HibajegySzerkesztesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.hibajegyWrite);
  const belso = user.permissions.includes(P.hibajegyBelso);
  const h = await szervizApi.getHibajegy(id, {
    kind: "staff",
    userId: user.id,
    belsoLathato: belso,
  });
  if (!h) notFound();
  if (h.archivalt) redirect(`/szerviz/hibajegyek/${id}`);
  const [partnerek, felhasznalok, projektek] = await Promise.all([
    betoltPartnerOpciok(),
    szervizApi.listFelhasznalok(),
    projektApi.listProjektOpciok(),
  ]);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${h.azonosito} szerkesztése`} />
      <HibajegyForm
        hibajegy={h}
        partnerek={partnerek}
        felhasznalok={felhasznalok}
        projektek={projektek}
        belsoJegyzetSzerkesztheto={belso}
      />
    </Container>
  );
}

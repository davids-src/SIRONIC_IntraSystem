import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { ERTEKESITES_PERMISSIONS as P } from "@erp/ertekesites/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { SablonForm } from "../../../_components/sablon-form";

export default async function UjSablonPage() {
  await requirePermission(P.szerzodesWrite);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új szerződés-sablon" />
      <SablonForm />
    </Container>
  );
}

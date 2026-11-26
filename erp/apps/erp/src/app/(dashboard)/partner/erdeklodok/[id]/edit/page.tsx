import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "../../../_components/form-ui";
import { ErdeklodoForm } from "../../_components/erdeklodo-form";

export default async function EditErdeklodoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  const e = await partnerApi.getErdeklodo(id);
  if (!e) notFound();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${e.cegNev} szerkesztése`} />
      <ErdeklodoForm erdeklodo={e} />
    </Container>
  );
}

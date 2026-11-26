import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "../../_components/form-ui";
import { PartnerForm } from "../../_components/partner-form";

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PARTNER_PERMISSIONS.partnerWrite);
  const partner = await partnerApi.getPartner(id);
  if (!partner) notFound();
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title={`${partner.nev} szerkesztése`} />
      <PartnerForm partner={partner} />
    </Container>
  );
}

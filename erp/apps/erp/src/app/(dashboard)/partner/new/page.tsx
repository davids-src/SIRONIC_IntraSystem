import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "../_components/form-ui";
import { PartnerForm } from "../_components/partner-form";

export default async function NewPartnerPage() {
  await requirePermission(PARTNER_PERMISSIONS.partnerWrite);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új partner" subtitle="Csak a típus és a név kötelező." />
      <PartnerForm />
    </Container>
  );
}

import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import { PageHeader } from "../../_components/form-ui";
import { ErdeklodoForm } from "../_components/erdeklodo-form";

export default async function NewErdeklodoPage() {
  await requirePermission(PARTNER_PERMISSIONS.erdeklodoWrite);
  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <PageHeader title="Új érdeklődő" subtitle="Csak a cégnév kötelező." />
      <ErdeklodoForm />
    </Container>
  );
}

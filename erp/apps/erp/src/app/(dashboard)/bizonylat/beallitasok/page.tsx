import { requirePermission } from "@erp/auth";
import { Container } from "@erp/ui";
import { bizonylatApi } from "@erp/bizonylat";
import { BIZONYLAT_PERMISSIONS as P } from "@erp/bizonylat/client";
import { PageHeader } from "@/app/(dashboard)/partner/_components/form-ui";
import { JogiSzovegForm } from "../_components/jotallas-form";

export const dynamic = "force-dynamic";

export default async function BizonylatBeallitasokPage() {
  await requirePermission(P.jotallasWrite);
  const szoveg = await bizonylatApi.getJotallasiSzoveg();
  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Bizonylat-beállítások"
        subtitle="A jótállási jegyekre nyomtatott jogi szöveg. A módosítás csak az új jegyekre vonatkozik."
      />
      <JogiSzovegForm szoveg={szoveg} />
    </Container>
  );
}

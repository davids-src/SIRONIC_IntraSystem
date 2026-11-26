import { requirePermission } from "@erp/auth";
import { partnerApi } from "@erp/partner";
import { infraApi } from "@erp/infra";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { OldalUrlap } from "../../_components/oldal-urlap";

export default async function UjOldalPage({
  searchParams,
}: {
  searchParams: Promise<{ stack?: string }>;
}) {
  await requirePermission("infra:oldal:write");
  const { stack } = await searchParams;
  const [partnerek, stackek, dnsAlap] = await Promise.all([
    partnerApi.listPartnerOptions(),
    infraApi.listStackSzolgaltatasok(),
    infraApi.dnsAlapertelmezes(),
  ]);
  return (
    <FormPage
      title="Új oldal"
      subtitle="Egy lépésben beállítja a DNS rekordot (Cloudflare), az SSL tanúsítványt (Let's Encrypt, DNS-01) és az NPM proxy hostot a kiválasztott szolgáltatásra."
      backHref="/infra/oldalak"
      backLabel="Vissza az oldalakhoz"
      width="max-w-4xl"
    >
      <OldalUrlap
        stackek={stackek}
        partnerek={partnerek}
        dnsAlap={dnsAlap}
        kezdoStackId={stack}
      />
    </FormPage>
  );
}

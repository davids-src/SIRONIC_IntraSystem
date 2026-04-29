import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";

interface OfferAcceptedProps {
  lang?: Language;
  offer_number: string;
  contact_name: string;
  total_net: string;
  accepted_at: string;
  id: string;
}

export const OfferAccepted = ({
  lang = "hu",
  offer_number,
  contact_name,
  total_net,
  accepted_at,
  id,
}: OfferAcceptedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.offer_accepted} - ${offer_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.offer_accepted} lang={lang}>
      <DataBlock
        rows={[
          { label: "Ajánlatszám / Offer No.", value: offer_number },
          { label: "Kontakt / Contact", value: contact_name },
          { label: "Összeg / Amount", value: total_net },
          { label: "Elfogadva / Accepted", value: accepted_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Megnyitás CRM-ben" : "Open in CRM",
          url: `https://crm.sironic.hu/offers/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default OfferAccepted;

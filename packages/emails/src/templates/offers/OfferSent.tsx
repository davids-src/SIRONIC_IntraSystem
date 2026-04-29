import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface OfferSentProps {
  lang?: Language;
  contact_name: string;
  offer_number: string;
  valid_until: string;
  total_net: string;
  id: string;
  pdf_url: string;
}

export const OfferSent = ({
  lang = "hu",
  contact_name,
  offer_number,
  valid_until,
  total_net,
  id,
  pdf_url,
}: OfferSentProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.quotation} - ${offer_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.quotation} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Ajánlatot készítettünk az Ön részére."
          : "We have prepared a quotation for you."}
      </Text>

      <DataBlock
        rows={[
          { label: "Ajánlatszám / Offer No.", value: offer_number },
          { label: "Érvényes / Valid until", value: valid_until },
          { label: "Nettó összeg / Net total", value: total_net },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Ajánlat megtekintése" : "View Quotation",
          url: `https://portal.sironic.hu/offers/${id}`,
        }}
        secondary={{
          label: t.download_pdf,
          url: pdf_url,
        }}
      />
    </BaseLayout>
  );
};

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  marginBottom: "16px",
};

export default OfferSent;

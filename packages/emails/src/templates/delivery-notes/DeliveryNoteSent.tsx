import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface DeliveryNoteSentProps {
  lang?: Language;
  contact_name: string;
  delivery_number: string;
  issue_date: string;
  notes?: string | null;
  id: string;
  pdf_url?: string;
}

export const DeliveryNoteSent = ({
  lang = "hu",
  contact_name,
  delivery_number,
  issue_date,
  notes,
  id,
  pdf_url,
}: DeliveryNoteSentProps) => {
  const t = useEmailTranslations(lang);
  const previewText =
    lang === "hu"
      ? `Szállítólevél - ${delivery_number}`
      : `Delivery Note - ${delivery_number}`;
  const headerLabel = lang === "hu" ? "Szállítólevél" : "Delivery Note";

  return (
    <BaseLayout previewText={previewText} headerLabel={headerLabel} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Szállítólevelet állítottunk ki az Önök részére."
          : "We have issued a delivery note for you."}
      </Text>

      <DataBlock
        rows={[
          {
            label: lang === "hu" ? "Szállítólevél száma" : "Delivery Note No.",
            value: delivery_number,
          },
          { label: lang === "hu" ? "Kiadás dátuma" : "Issue Date", value: issue_date },
          { label: lang === "hu" ? "Megjegyzés" : "Notes", value: notes || "-" },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Szállítólevél megtekintése" : "View Delivery Note",
          url: `https://portal.sironic.eu/delivery-notes/${id}`,
        }}
        secondary={
          pdf_url
            ? {
                label: t.download_pdf,
                url: pdf_url,
              }
            : undefined
        }
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

export default DeliveryNoteSent;

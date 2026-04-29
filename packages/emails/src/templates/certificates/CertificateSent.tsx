import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface CertificateSentProps {
  lang?: Language;
  contact_name: string;
  certificate_number: string;
  title: string;
  work_period_start: string;
  work_period_end: string;
  total_hours?: string | null;
  id: string;
}

export const CertificateSent = ({
  lang = "hu",
  contact_name,
  certificate_number,
  title,
  work_period_start,
  work_period_end,
  total_hours,
  id,
}: CertificateSentProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.completion_certificate} - ${certificate_number}`;

  return (
    <BaseLayout
      previewText={previewText}
      headerLabel={t.completion_certificate}
      lang={lang}
    >
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Teljesítési igazolást küldünk az elvégzett munkáról. Kérjük tekintse át és írja alá digitálisan."
          : "Please review and digitally sign the completion certificate for the work performed."}
      </Text>

      <DataBlock
        rows={[
          { label: "Igazolásszám / Certificate No.", value: certificate_number },
          { label: "Cím / Title", value: title },
          {
            label: "Időszak / Period",
            value: `${work_period_start} – ${work_period_end}`,
          },
          { label: "Összes óra / Total hours", value: total_hours },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Megtekintés és aláírás" : "Review and Sign",
          url: `https://portal.sironic.eu/completion-certificates/${id}`,
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

export default CertificateSent;

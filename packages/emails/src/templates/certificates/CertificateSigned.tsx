import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";

interface CertificateSignedProps {
  lang?: Language;
  certificate_number: string;
  contact_name: string;
  client_name: string;
  signed_at: string;
  id: string;
}

export const CertificateSigned = ({
  lang = "hu",
  certificate_number,
  contact_name,
  client_name,
  signed_at,
  id,
}: CertificateSignedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.certificate_signed} - ${certificate_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.certificate_signed} lang={lang}>
      <DataBlock
        rows={[
          { label: "Igazolásszám / Certificate No.", value: certificate_number },
          { label: "Kontakt / Contact", value: contact_name },
          { label: "Aláíró / Signed by", value: client_name },
          { label: "Időpont / Time", value: signed_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Igazolás megnyitása" : "Open Certificate",
          url: `https://crm.sironic.hu/completion-certificates/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default CertificateSigned;

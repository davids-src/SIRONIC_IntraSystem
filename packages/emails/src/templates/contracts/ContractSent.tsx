import * as React from "react";
import { Language } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface ContractSentProps {
  lang?: Language;
  contact_name: string;
  contract_number: string;
  name: string;
  category: string;
  valid_from?: string | null;
  valid_until?: string | null;
  signing_type: "digital" | "paper" | "none";
  id: string;
  pdf_url?: string | null;
}

export const ContractSent = ({
  lang = "hu",
  contact_name,
  contract_number,
  name,
  category,
  valid_from,
  valid_until,
  signing_type,
  id,
  pdf_url,
}: ContractSentProps) => {
  const previewText =
    lang === "hu"
      ? `Szerződés érkezett – ${contract_number} – SIRONIC`
      : `Contract received – ${contract_number} – SIRONIC`;

  const headerLabel = lang === "hu" ? "Szerződés" : "Contract";

  const intro =
    lang === "hu"
      ? "Szerződést küldtünk az Ön részére. Kérjük tekintse át és írja alá digitálisan a portálon."
      : "A contract has been sent to you. Please review and sign it digitally on the portal.";

  const validityValue =
    valid_from && valid_until
      ? `${valid_from} – ${valid_until}`
      : valid_from
        ? `${valid_from} –`
        : "–";

  return (
    <BaseLayout previewText={previewText} headerLabel={headerLabel} lang={lang}>
      <Text style={paragraph}>
        {lang === "hu" ? `Kedves ${contact_name}!` : `Dear ${contact_name},`}
      </Text>
      <Text style={paragraph}>{intro}</Text>

      <DataBlock
        rows={[
          {
            label: "Szerződésszám / Contract No.",
            value: contract_number,
          },
          { label: "Megnevezés / Name", value: name },
          { label: "Kategória / Category", value: category },
          { label: "Érvényesség / Valid", value: validityValue },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Megtekintés és aláírás" : "Review and Sign",
          url: `https://portal.sironic.hu/contracts/${id}`,
        }}
        secondary={
          pdf_url
            ? {
                label: lang === "hu" ? "PDF letöltése" : "Download PDF",
                url: pdf_url,
              }
            : undefined
        }
      />

      {signing_type !== "digital" && (
        <Text style={{ ...paragraph, color: "#6b7280", fontSize: "12px" }}>
          {lang === "hu"
            ? "Ez a szerződés papír alapú aláírást igényel. A PDF letölthető a portálról."
            : "This contract requires a paper signature. The PDF can be downloaded from the portal."}
        </Text>
      )}
    </BaseLayout>
  );
};

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  marginBottom: "16px",
};

export default ContractSent;

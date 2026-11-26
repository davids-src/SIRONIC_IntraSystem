import * as React from "react";
import { Language } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface ContractSignedProps {
  lang?: Language;
  contract_number: string;
  name: string;
  contact_name: string;
  client_name: string;
  signed_at: string;
  id: string;
}

export const ContractSigned = ({
  lang = "hu",
  contract_number,
  name,
  contact_name,
  client_name,
  signed_at,
  id,
}: ContractSignedProps) => {
  const previewText =
    lang === "hu"
      ? `Szerződés aláírva – ${contract_number} – ${contact_name}`
      : `Contract signed – ${contract_number} – ${contact_name}`;

  const headerLabel = lang === "hu" ? "Szerződés aláírva" : "Contract Signed";

  return (
    <BaseLayout previewText={previewText} headerLabel={headerLabel} lang={lang}>
      <Text style={paragraph}>
        {lang === "hu"
          ? `A ${contact_name} partner digitálisan aláírta a szerződést.`
          : `The partner ${contact_name} has digitally signed the contract.`}
      </Text>

      <DataBlock
        rows={[
          {
            label: "Szerződésszám / Contract No.",
            value: contract_number,
          },
          { label: "Megnevezés / Name", value: name },
          { label: "Kontakt / Contact", value: contact_name },
          { label: "Aláíró neve / Signed by", value: client_name },
          { label: "Aláírás időpontja / Signed at", value: signed_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Szerződés megnyitása" : "Open Contract",
          url: `https://crm.sironic.hu/contracts/${id}`,
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

export default ContractSigned;

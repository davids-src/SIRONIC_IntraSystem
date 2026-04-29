import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";

interface StagingApprovedProps {
  lang?: Language;
  project_name: string;
  staging_label: string;
  contact_name: string;
  approved_at: string;
  id: string;
}

export const StagingApproved = ({
  lang = "hu",
  project_name,
  staging_label,
  contact_name,
  approved_at,
  id,
}: StagingApprovedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.version_approved} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.version_approved} lang={lang}>
      <DataBlock
        rows={[
          { label: "Projekt / Project", value: project_name },
          { label: "Verzió / Version", value: staging_label },
          { label: "Jóváhagyta / Approved by", value: contact_name },
          { label: "Időpont / Time", value: approved_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: t.crm_cta,
          url: `https://crm.sironic.hu/projects/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default StagingApproved;

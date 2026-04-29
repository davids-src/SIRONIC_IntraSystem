import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";

interface StagingChangesRequestedProps {
  lang?: Language;
  project_name: string;
  staging_label: string;
  contact_name: string;
  approval_note: string;
  id: string;
}

export const StagingChangesRequested = ({
  lang = "hu",
  project_name,
  staging_label,
  contact_name,
  approval_note,
  id,
}: StagingChangesRequestedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.changes_requested} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.changes_requested} lang={lang}>
      <DataBlock
        rows={[
          { label: "Projekt / Project", value: project_name },
          { label: "Verzió / Version", value: staging_label },
          { label: "Kontakt / Contact", value: contact_name },
        ]}
      />

      <SectionTitle title={lang === "hu" ? "Megjegyzés / Notes" : "Notes"} />
      <TextBlock>{approval_note}</TextBlock>

      <CtaGroup
        primary={{
          label: t.crm_cta,
          url: `https://crm.sironic.hu/projects/${id}`,
        }}
      />
    </BaseLayout>
  );
};

export default StagingChangesRequested;

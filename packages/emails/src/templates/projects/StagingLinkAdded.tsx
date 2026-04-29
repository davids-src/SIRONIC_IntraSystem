import * as React from "react";
import { Language, useEmailTranslations } from "../../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface StagingLinkAddedProps {
  lang?: Language;
  contact_name: string;
  project_name: string;
  staging_label: string;
  added_at: string;
  id: string;
  staging_url: string;
}

export const StagingLinkAdded = ({
  lang = "hu",
  contact_name,
  project_name,
  staging_label,
  added_at,
  id,
  staging_url,
}: StagingLinkAddedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.approval_required} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.approval_required} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Új verzió érhető el megtekintésre és jóváhagyásra."
          : "A new version is available for review and approval."}
      </Text>

      <DataBlock
        rows={[
          { label: "Projekt / Project", value: project_name },
          { label: "Verzió / Version", value: staging_label },
          { label: "Hozzáadva / Added", value: added_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Megtekintés és jóváhagyás" : "Review and Approve",
          url: `https://portal.sironic.hu/projects/${id}?tab=staging`,
        }}
        secondary={{
          label: lang === "hu" ? "Közvetlen megnyitás" : "Open directly",
          url: staging_url,
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

export default StagingLinkAdded;

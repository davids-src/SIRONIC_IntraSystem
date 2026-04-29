import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface ProjectCreatedProps {
  lang?: Language;
  contact_name: string;
  project_name: string;
  category?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  assigned_staff_name?: string | null;
  id: string;
}

export const ProjectCreated = ({
  lang = "hu",
  contact_name,
  project_name,
  category,
  start_date,
  deadline,
  assigned_staff_name,
  id,
}: ProjectCreatedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.project_started} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.project_started} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Projektjét rögzítettük, a portálon nyomon követheti az előrehaladást."
          : "Your project has been created. You can track progress on the portal."}
      </Text>

      <DataBlock
        rows={[
          { label: "Projektnév / Project", value: project_name },
          { label: "Kategória / Category", value: category },
          { label: "Kezdés / Start", value: start_date },
          { label: "Határidő / Deadline", value: deadline },
          { label: "Felelős / Assigned to", value: assigned_staff_name },
        ]}
      />

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Projekt megtekintése" : "View Project",
          url: `https://portal.sironic.hu/projects/${id}`,
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

export default ProjectCreated;

import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";

interface PhaseCompletedProps {
  lang?: Language;
  project_name: string;
  phase_name: string;
  completed_at: string;
  next_phase_name?: string | null;
  id: string;
}

export const PhaseCompleted = ({
  lang = "hu",
  project_name,
  phase_name,
  completed_at,
  next_phase_name,
  id,
}: PhaseCompletedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.project_update} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.project_update} lang={lang}>
      <DataBlock
        rows={[
          { label: "Projekt / Project", value: project_name },
          { label: "Teljesített fázis / Completed phase", value: phase_name },
          { label: "Teljesítve / Completed", value: completed_at },
          { label: "Következő fázis / Next phase", value: next_phase_name },
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

export default PhaseCompleted;

import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";

interface ChecklistItemUploadedProps {
  lang?: Language;
  project_name: string;
  checklist_item_label: string;
  contact_name: string;
  uploaded_at: string;
  id: string;
}

export const ChecklistItemUploaded = ({
  lang = "hu",
  project_name,
  checklist_item_label,
  contact_name,
  uploaded_at,
  id,
}: ChecklistItemUploadedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.material_received} - ${project_name}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.material_received} lang={lang}>
      <DataBlock
        rows={[
          { label: "Projekt / Project", value: project_name },
          { label: "Tétel / Item", value: checklist_item_label },
          { label: "Feltöltötte / Uploaded by", value: contact_name },
          { label: "Időpont / Time", value: uploaded_at },
        ]}
      />

      <CtaGroup
        primary={{
          label: t.crm_cta,
          url: `https://crm.sironic.eu/projects/${id}?tab=checklist`,
        }}
      />
    </BaseLayout>
  );
};

export default ChecklistItemUploaded;

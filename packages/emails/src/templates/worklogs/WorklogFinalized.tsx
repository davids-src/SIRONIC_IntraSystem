import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, TextBlock, CtaGroup, SectionTitle } from "../base";
import { Text } from "@react-email/components";

interface WorklogFinalizedProps {
  lang?: Language;
  contact_name: string;
  worklog_number: string;
  work_date: string;
  technician_name: string;
  work_category: string;
  site_address?: string | null;
  work_description: string;
  id: string;
  pdf_url?: string;
}

export const WorklogFinalized = ({
  lang = "hu",
  contact_name,
  worklog_number,
  work_date,
  technician_name,
  work_category,
  site_address,
  work_description,
  id,
  pdf_url,
}: WorklogFinalizedProps) => {
  const t = useEmailTranslations(lang);

  const previewText = `${t.worklog} - ${worklog_number}`;

  return (
    <BaseLayout previewText={previewText} headerLabel={t.worklog} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Az elvégzett munkáról munkalapot készítettünk."
          : "We have prepared a worklog for the completed work."}
      </Text>

      <DataBlock
        rows={[
          { label: "Munkalapszám / Worklog No.", value: worklog_number },
          { label: "Dátum / Date", value: work_date },
          { label: "Technikus / Technician", value: technician_name },
          { label: "Kategória / Category", value: work_category },
          { label: "Helyszín / Location", value: site_address },
        ]}
      />

      <SectionTitle title={lang === "hu" ? "Leírás / Description" : "Description"} />
      <TextBlock>
        {work_description.length > 300
          ? `${work_description.substring(0, 300)}...`
          : work_description}
      </TextBlock>

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Munkalap megtekintése" : "View Worklog",
          url: `https://portal.sironic.hu/worklogs/${id}`,
        }}
        secondary={
          pdf_url
            ? {
                label: t.download_pdf,
                url: pdf_url,
              }
            : undefined
        }
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

export default WorklogFinalized;

import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup, FeatureList } from "../base";
import { Text, Hr } from "@react-email/components";

interface WorklogSentProps {
  lang?: Language;
  worklog_number: string;
  client_name: string;
  date: string;
  work_summary: string;
  pdf_url?: string;
  portal_url?: string;
}

export const WorklogSent = ({
  lang = "hu",
  worklog_number,
  client_name,
  date,
  work_summary,
  pdf_url,
  portal_url,
}: WorklogSentProps) => {
  const t = useEmailTranslations(lang);

  const previewText =
    lang === "hu"
      ? `Elkészült a munkalap: ${worklog_number}`
      : `Worklog finalized: ${worklog_number}`;

  return (
    <BaseLayout
      previewText={previewText}
      headerLabel={lang === "hu" ? "Munkalap" : "Worklog"}
      lang={lang}
    >
      <Text style={paragraph}>
        {lang === "hu" ? `Tisztelt ${client_name}!` : `Dear ${client_name},`}
      </Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Tájékoztatjuk, hogy az alábbi munkalap státusza véglegesítve lett a rendszerünkben."
          : "We would like to inform you that the following worklog has been finalized in our system."}
      </Text>

      <Hr style={divider} />

      <Text style={sectionTitle}>
        {lang === "hu" ? "Munkalap adatai" : "Worklog details"}
      </Text>

      <DataBlock
        rows={[
          {
            label: lang === "hu" ? "Munkalap száma" : "Worklog number",
            value: worklog_number,
          },
          { label: lang === "hu" ? "Dátum" : "Date", value: date },
        ]}
      />

      <Text style={{ ...paragraph, marginTop: "16px", fontWeight: "bold" }}>
        {lang === "hu" ? "Elvégzett munka:" : "Work summary:"}
      </Text>
      <Text
        style={{
          ...paragraph,
          whiteSpace: "pre-wrap",
          background: "#f9fafb",
          padding: "12px",
          borderRadius: "8px",
        }}
      >
        {work_summary}
      </Text>

      <Hr style={divider} />

      <Text style={paragraph}>
        {lang === "hu"
          ? "A munkalap hivatalos PDF változatát a Partner Portálon keresztül tudja letölteni és megtekinteni."
          : "You can view and download the official PDF version of the worklog via our Partner Portal."}
      </Text>

      {portal_url && (
        <CtaGroup
          primary={{
            label: lang === "hu" ? "Megtekintés a portálon" : "View in Portal",
            url: portal_url,
          }}
        />
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

const sectionTitle = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "700" as const,
  marginBottom: "12px",
};

const divider = {
  borderColor: "#e5e7eb",
  marginTop: "20px",
  marginBottom: "20px",
};

export default WorklogSent;

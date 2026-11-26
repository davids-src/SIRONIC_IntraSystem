import * as React from "react";
import { Language } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface ProjectClosedProps {
  lang?: Language;
  contact_name: string;
  project_name: string;
  id: string;
  documents: {
    type: string;
    number: string;
  }[];
}

export const ProjectClosed = ({
  lang = "hu",
  contact_name,
  project_name,
  id,
  documents,
}: ProjectClosedProps) => {
  const previewText =
    lang === "hu"
      ? `Projekt sikeresen lezárva - ${project_name}`
      : `Project successfully closed - ${project_name}`;

  return (
    <BaseLayout
      previewText={previewText}
      headerLabel={lang === "hu" ? "Projekt lezárva" : "Project Closed"}
      lang={lang}
    >
      <Text style={paragraph}>
        {lang === "hu" ? `Kedves ${contact_name},` : `Dear ${contact_name},`}
      </Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? `Tájékoztatjuk, hogy a(z) "${project_name}" projektünk sikeresen lezárásra került. A projekthez kapcsolódó hivatalos dokumentumokat alább találja:`
          : `We inform you that our project "${project_name}" has been successfully closed. The official documents related to the project are listed below:`}
      </Text>

      {documents && documents.length > 0 ? (
        <DataBlock
          rows={documents.map((doc) => ({
            label: doc.type,
            value: doc.number,
          }))}
        />
      ) : (
        <Text style={paragraph}>
          {lang === "hu"
            ? "Ehhez a projekthez nem kapcsolódnak dokumentumok."
            : "No documents are associated with this project."}
        </Text>
      )}

      <Text style={paragraph}>
        {lang === "hu"
          ? "Köszönjük az együttműködést! A részleteket és a dokumentumokat a Partner Portálon is bármikor megtekintheti."
          : "Thank you for the cooperation! You can view details and documents anytime on the Partner Portal."}
      </Text>

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Projekt megtekintése" : "View Project",
          url: `https://portal.sironic.eu/projects/${id}`,
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

export default ProjectClosed;

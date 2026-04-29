import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup, FeatureList } from "../base";
import { Text } from "@react-email/components";

interface PortalInviteProps {
  lang?: Language;
  contact_name: string;
  contact_email: string;
  token: string;
}

export const PortalInvite = ({
  lang = "hu",
  contact_name,
  contact_email,
  token,
}: PortalInviteProps) => {
  const t = useEmailTranslations(lang);

  const previewText =
    lang === "hu"
      ? "Meghívó – SIRONIC Partner Portál"
      : "Invitation – SIRONIC Partner Portal";

  const features =
    lang === "hu"
      ? [
          "Projektek nyomon követése",
          "Ticketek bejelentése és követése",
          "Munkalapok és dokumentumok letöltése",
          "Teljesítési igazolások digitális aláírása",
        ]
      : [
          "Track your projects",
          "Submit and follow tickets",
          "Download worklogs and documents",
          "Digitally sign completion certificates",
        ];

  return (
    <BaseLayout previewText={previewText} headerLabel={t.portal_invitation} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Hozzáférést kapott a SIRONIC Partner Portálhoz."
          : "You have been granted access to the SIRONIC Partner Portal."}
      </Text>

      <FeatureList features={features} />

      <DataBlock
        rows={[
          { label: "Portál URL", value: "https://portal.sironic.eu" },
          { label: "E-mail", value: contact_email },
        ]}
      />

      <CtaGroup
        primary={{
          label:
            lang === "hu" ? "Jelszó beállítása és belépés" : "Set Password and Login",
          url: `https://portal.sironic.eu/set-password?token=${token}`,
        }}
      />

      <Text style={noteStyle}>
        {lang === "hu" ? "A link 48 óráig érvényes." : "This link is valid for 48 hours."}
      </Text>
    </BaseLayout>
  );
};

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  marginBottom: "16px",
};

const noteStyle = {
  color: "#6b7280",
  fontSize: "12px",
  marginTop: "16px",
  fontStyle: "italic" as const,
};

export default PortalInvite;

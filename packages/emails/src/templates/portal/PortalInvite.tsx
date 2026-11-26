import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup, FeatureList } from "../base";
import { Text, Hr } from "@react-email/components";

interface PortalInviteProps {
  lang?: Language;
  contact_name: string;
  contact_email: string;
  token: string;
  portal_url?: string;
}

export const PortalInvite = ({
  lang = "hu",
  contact_name,
  contact_email,
  token,
  portal_url = "https://portal.sironic.eu",
}: PortalInviteProps) => {
  const t = useEmailTranslations(lang);

  const previewText =
    lang === "hu"
      ? "Meghívó – SIRONIC Partner Portál"
      : "Invitation – SIRONIC Partner Portal";

  const features =
    lang === "hu"
      ? [
          "📁 Projektek – Nyomon követheti aktív projektjeit, azok előrehaladását és mérföldköveit",
          "🎫 Ticketek – Hibajelentés, kérelmek beküldése és státuszuk követése valós időben",
          "📋 Munkalapok – Elvégzett munkák dokumentumainak megtekintése és letöltése",
          "📄 Árajánlatok – Testreszabott árajánlatok megtekintése, elfogadása vagy elutasítása",
          "🧾 Számlák – Kibocsátott számlák listázása és letöltése",
          "📝 Szerződések – Szerződéseinek digitális megtekintése",
          "✅ Teljesítési igazolások – Digitális aláírás lehetősége",
          "🏢 Cégprofil – Saját szervezeti adatainak megtekintése és frissítése",
        ]
      : [
          "📁 Projects – Track your active projects, milestones and progress",
          "🎫 Tickets – Submit and follow support requests in real time",
          "📋 Work Logs – View and download completed work documentation",
          "📄 Offers – View, accept or reject tailored quotations",
          "🧾 Invoices – Browse and download your invoices",
          "📝 Contracts – View your contracts digitally",
          "✅ Completion Certificates – Sign digitally",
          "🏢 Company Profile – View and update your organization data",
        ];

  return (
    <BaseLayout previewText={previewText} headerLabel={t.portal_invitation} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Örömmel értesítjük, hogy hozzáférést kapott a SIRONIC Partner Portálhoz – az Ön számára kialakított önkiszolgáló felülethez, ahol minden projektjével, dokumentumával és kommunikációjával kapcsolatos információt egy helyen érhet el."
          : "We are pleased to inform you that you have been granted access to the SIRONIC Partner Portal – your self-service platform where you can manage all your projects, documents and communications in one place."}
      </Text>

      <Hr style={divider} />

      <Text style={sectionTitle}>
        {lang === "hu"
          ? "Mit érhet el a portálon?"
          : "What can you access on the portal?"}
      </Text>

      <FeatureList features={features} />

      <Hr style={divider} />

      <DataBlock
        rows={[
          { label: "Portál URL", value: portal_url },
          { label: "E-mail", value: contact_email },
        ]}
      />

      <Text style={paragraph}>
        {lang === "hu"
          ? "Az alábbi gombra kattintva beállíthatja jelszavát és azonnal beléphet a portálra. A link 48 óráig érvényes."
          : "Click the button below to set your password and access the portal. The link is valid for 48 hours."}
      </Text>

      <CtaGroup
        primary={{
          label:
            lang === "hu" ? "Jelszó beállítása és belépés" : "Set Password and Login",
          url: `${portal_url}/set-password?token=${token}`,
        }}
      />

      <Text style={noteStyle}>
        {lang === "hu"
          ? "Ha nem Ön kérte ezt a meghívót, hagyja figyelmen kívül ezt az e-mailt. A link 48 óra elteltével automatikusan érvénytelenné válik."
          : "If you did not request this invitation, please ignore this email. The link will automatically expire after 48 hours."}
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

const noteStyle = {
  color: "#6b7280",
  fontSize: "12px",
  marginTop: "16px",
  fontStyle: "italic" as const,
};

export default PortalInvite;

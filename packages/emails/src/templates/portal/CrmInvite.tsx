import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, DataBlock, CtaGroup, FeatureList } from "../base";
import { Text, Hr } from "@react-email/components";

interface CrmInviteProps {
  lang?: Language;
  user_name: string;
  user_email: string;
  token: string;
  crm_url?: string;
}

export const CrmInvite = ({
  lang = "hu",
  user_name,
  user_email,
  token,
  crm_url = "http://localhost:3000",
}: CrmInviteProps) => {
  const t = useEmailTranslations(lang);

  const previewText =
    lang === "hu" ? "Meghívó – SIRONIC CRM Rendszer" : "Invitation – SIRONIC CRM System";

  const features =
    lang === "hu"
      ? [
          "Munkatársak, partnerek és alvállalkozók kezelése",
          "Árajánlatok, szerződések és számlák készítése",
          "Projektek, munkalapok és ticketek nyomon követése",
          "Központi árlista és készletgazdálkodás",
        ]
      : [
          "Manage team members, partners and subcontractors",
          "Create offers, contracts and invoices",
          "Track projects, worklogs and tickets",
          "Central price list and inventory management",
        ];

  return (
    <BaseLayout
      previewText={previewText}
      headerLabel={t.portal_invitation.replace("Partner Portál", "CRM")}
      lang={lang}
    >
      <Text style={paragraph}>{t.greeting.replace("{name}", user_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Meghívót kapott, hogy csatlakozzon munkatársként a SIRONIC belső CRM és ügyviteli rendszeréhez."
          : "You have been invited to join the SIRONIC internal CRM system as a team member."}
      </Text>

      <Hr style={divider} />

      <Text style={sectionTitle}>
        {lang === "hu" ? "Mik a legfőbb funkciók?" : "Main features"}
      </Text>

      <FeatureList features={features} />

      <Hr style={divider} />

      <DataBlock
        rows={[
          { label: "Belépési cím", value: crm_url },
          { label: "E-mail cím", value: user_email },
        ]}
      />

      <Text style={paragraph}>
        {lang === "hu"
          ? "Kattintson az alábbi gombra a jelszava beállításához. A link 48 óráig érvényes."
          : "Click the button below to set your password. The link is valid for 48 hours."}
      </Text>

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Jelszó beállítása" : "Set Password",
          url: `${crm_url}/set-password?token=${token}`,
        }}
      />

      <Text style={noteStyle}>
        {lang === "hu"
          ? "Ha nem Ön kérte a meghívót, hagyja figyelmen kívül ezt az e-mailt."
          : "If you did not request this invitation, please ignore this email."}
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

export default CrmInvite;

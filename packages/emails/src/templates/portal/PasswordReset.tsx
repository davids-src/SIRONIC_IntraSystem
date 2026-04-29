import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";
import { BaseLayout, CtaGroup } from "../base";
import { Text } from "@react-email/components";

interface PasswordResetProps {
  lang?: Language;
  contact_name: string;
  token: string;
}

export const PasswordReset = ({
  lang = "hu",
  contact_name,
  token,
}: PasswordResetProps) => {
  const t = useEmailTranslations(lang);

  const previewText =
    lang === "hu"
      ? "Jelszó visszaállítás – SIRONIC Partner Portál"
      : "Password Reset – SIRONIC Partner Portal";

  return (
    <BaseLayout previewText={previewText} headerLabel={t.password_reset} lang={lang}>
      <Text style={paragraph}>{t.greeting.replace("{name}", contact_name)}</Text>
      <Text style={paragraph}>
        {lang === "hu"
          ? "Jelszó visszaállítási kérelmet rögzítettünk ehhez a fiókhoz."
          : "A password reset request was received for this account."}
      </Text>

      <CtaGroup
        primary={{
          label: lang === "hu" ? "Új jelszó beállítása" : "Set New Password",
          url: `https://portal.sironic.eu/reset-password?token=${token}`,
        }}
      />

      <Text style={noteStyle}>
        {lang === "hu"
          ? "Ha nem Ön kérte, hagyja figyelmen kívül ezt az e-mailt."
          : "If you did not request this, please ignore this email."}
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

export default PasswordReset;

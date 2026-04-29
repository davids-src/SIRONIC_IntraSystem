import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { Language, useEmailTranslations } from "../../i18n";

interface BaseLayoutProps {
  children: React.ReactNode;
  previewText?: string;
  headerLabel: string;
  lang?: Language;
}

export const BaseLayout = ({
  children,
  previewText,
  headerLabel,
  lang = "hu",
}: BaseLayoutProps) => {
  const t = useEmailTranslations(lang);

  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <table width="100%">
              <tr>
                <td align="left">
                  <Text style={logo}>SIRONIC</Text>
                </td>
                <td align="right">
                  <Text style={headerLabelStyle}>{headerLabel}</Text>
                </td>
              </tr>
            </table>
          </Section>

          {/* Accent Bar */}
          <div style={accentBar} />

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              SIRONIC Kft. · Székesfehérvár
              <br />
              {lang === "hu"
                ? "Ez egy automatikus értesítő e-mail, kérjük ne válaszoljon rá."
                : "This is an automated notification, please do not reply."}
              <br />
              <a href="https://sironic.eu" style={footerLink}>
                sironic.eu
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f3f4f6",
  fontFamily: "Inter, Helvetica, Arial, sans-serif",
  padding: "40px 16px",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const header = {
  backgroundColor: "#0a0a0a",
  padding: "20px 32px",
};

const logo = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold",
  margin: 0,
};

const headerLabelStyle = {
  color: "#e53935",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: 0,
};

const accentBar = {
  height: "3px",
  backgroundColor: "#e53935",
  width: "100%",
};

const content = {
  padding: "32px",
};

const footer = {
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
  padding: "20px 32px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: 1.6,
  margin: 0,
};

const footerLink = {
  color: "#9ca3af",
  textDecoration: "underline",
};

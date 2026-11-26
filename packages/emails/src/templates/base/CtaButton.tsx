import { Button } from "@react-email/components";
import * as React from "react";

interface CtaButtonProps {
  label: string;
  url: string;
  variant?: "primary" | "secondary";
}

export const CtaButton = ({ label, url, variant = "primary" }: CtaButtonProps) => {
  return (
    <Button href={url} style={variant === "primary" ? primary : secondary}>
      {label}
    </Button>
  );
};

interface CtaGroupProps {
  primary?: CtaButtonProps;
  secondary?: CtaButtonProps;
}

export const CtaGroup = ({ primary, secondary }: CtaGroupProps) => {
  return (
    <div style={groupContainer}>
      {primary && <CtaButton {...primary} variant="primary" />}
      {secondary && <CtaButton {...secondary} variant="secondary" />}
    </div>
  );
};

const primary = {
  backgroundColor: "#e53935",
  color: "#ffffff",
  borderRadius: "6px",
  padding: "12px 28px",
  fontSize: "14px",
  fontWeight: 600,
  display: "inline-block",
  textDecoration: "none",
  textAlign: "center" as const,
};

const secondary = {
  backgroundColor: "#ffffff",
  color: "#374151",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "11px 28px",
  fontSize: "14px",
  fontWeight: 500,
  display: "inline-block",
  textDecoration: "none",
  textAlign: "center" as const,
};

const groupContainer = {
  display: "flex",
  gap: "12px",
  marginTop: "16px",
  flexWrap: "wrap" as const,
};

import { Text } from "@react-email/components";
import * as React from "react";

interface SectionTitleProps {
  title: string;
}

export const SectionTitle = ({ title }: SectionTitleProps) => {
  return <Text style={style}>{title}</Text>;
};

const style = {
  color: "#e53935",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  marginBottom: "8px",
  marginTop: "24px",
};

import { Text } from "@react-email/components";
import * as React from "react";

interface TextBlockProps {
  children: React.ReactNode;
}

export const TextBlock = ({ children }: TextBlockProps) => {
  if (!children) return null;

  return (
    <div style={container}>
      <Text style={text}>{children}</Text>
    </div>
  );
};

const container = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "14px 18px",
  marginBottom: "16px",
};

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
  whiteSpace: "pre-wrap" as const,
};

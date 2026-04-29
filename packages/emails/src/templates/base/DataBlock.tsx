import { Section, Text } from "@react-email/components";
import * as React from "react";

export interface DataRow {
  label: string;
  value: string | React.ReactNode | null | undefined;
}

interface DataBlockProps {
  rows: DataRow[];
}

export const DataBlock = ({ rows }: DataBlockProps) => {
  const validRows = rows.filter((row) => row.value !== null && row.value !== undefined);

  if (validRows.length === 0) return null;

  return (
    <Section style={container}>
      {validRows.map((row, index) => (
        <div key={index} style={rowStyle(index === validRows.length - 1)}>
          <span style={labelStyle}>{row.label}:</span>
          <span style={valueStyle}>{row.value}</span>
        </div>
      ))}
    </Section>
  );
};

const container = {
  backgroundColor: "#f9fafb",
  borderLeft: "3px solid #e53935",
  borderRadius: "0 6px 6px 0",
  padding: "14px 18px",
  marginBottom: "16px",
};

const rowStyle = (isLast: boolean) => ({
  display: "flex",
  marginBottom: isLast ? "0" : "8px",
});

const labelStyle = {
  color: "#6b7280",
  fontSize: "12px",
  minWidth: "140px",
  display: "inline-block",
};

const valueStyle = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: 500,
};

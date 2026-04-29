import { Text } from "@react-email/components";
import * as React from "react";

interface FeatureListProps {
  features: string[];
}

export const FeatureList = ({ features }: FeatureListProps) => {
  if (!features || features.length === 0) return null;

  return (
    <div style={container}>
      <ul style={list}>
        {features.map((feature, index) => (
          <li key={index} style={item}>
            <span style={bullet}>•</span>
            <span style={text}>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const container = {
  margin: "16px 0",
};

const list = {
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const item = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "8px",
};

const bullet = {
  color: "#e53935",
  marginRight: "8px",
  fontWeight: "bold",
};

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
  margin: 0,
};

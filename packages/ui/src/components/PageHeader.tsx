import * as React from "react";
import { colors } from "../tokens";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ title, subtitle, actions, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.875rem",
            fontWeight: 700,
            color: colors.text.primary,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "0.875rem",
              color: colors.text.muted,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { colors, radius } from "../tokens";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  style?: React.CSSProperties;
}

export function StatCard({ label, value, icon, trend, style }: StatCardProps) {
  return (
    <div
      style={{
        background: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.lg,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: radius.md,
            background: colors.accent.badgeBg,
            color: colors.accent.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {trend && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: colors.status.success,
              background: "#052e16",
              padding: "2px 8px",
              borderRadius: radius.pill,
            }}
          >
            {trend}
          </span>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: colors.text.primary,
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "0.875rem",
            color: colors.text.secondary,
            marginTop: "4px",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { colors, radius } from "../tokens";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const variantMap: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: colors.accent.badgeBg, color: colors.accent.badgeText },
  success: { bg: "#052e16", color: "#4ade80" },
  warning: { bg: "#422006", color: "#fbbf24" },
  error: { bg: "#450a0a", color: "#f87171" },
  info: { bg: "#0c1a3a", color: "#60a5fa" },
};

export function Badge({ variant = "default", children, style }: BadgeProps) {
  const { bg, color } = variantMap[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: radius.pill,
        fontSize: "0.75rem",
        fontWeight: 600,
        background: bg,
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

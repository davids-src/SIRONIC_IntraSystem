"use client";

import * as React from "react";
import { colors, radius } from "../tokens";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: string | number;
  hoverable?: boolean;
}

export function Card({
  children,
  style,
  hoverable = false,
  padding = "24px",
  onMouseEnter,
  onMouseLeave,
  ...props
}: CardProps) {
  const [hovered, setHovered] = React.useState(false);

  const cardStyle: React.CSSProperties = {
    background: colors.bg.card,
    border: `1px solid ${hovered && hoverable ? colors.border.accent : colors.border.default}`,
    borderRadius: radius.lg,
    padding,
    transition: "border-color 0.2s",
    ...style,
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

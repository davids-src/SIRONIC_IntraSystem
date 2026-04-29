"use client";

import * as React from "react";
import { colors, radius } from "../tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: "32px", padding: "0 12px", fontSize: "0.8125rem", gap: "6px" },
  md: { height: "40px", padding: "0 16px", fontSize: "0.875rem", gap: "8px" },
  lg: { height: "48px", padding: "0 20px", fontSize: "1rem", gap: "8px" },
};

export function Button({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
    outline: "none",
    fontFamily: "inherit",
    ...sizeStyles[size],
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: hovered ? colors.accent.primaryHover : colors.accent.primary,
      color: "#fff",
      border: "1px solid transparent",
    },
    secondary: {
      background: "transparent",
      color: colors.text.primary,
      border: hovered
        ? `1px solid ${colors.accent.primary}`
        : `1px solid ${colors.border.default}`,
    },
    ghost: {
      background: hovered ? colors.bg.card : "transparent",
      color: colors.text.secondary,
      border: "1px solid transparent",
    },
  };

  return (
    <button
      style={{ ...base, ...variantStyles[variant], ...style }}
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
      {iconLeft && iconLeft}
      {children}
      {iconRight && iconRight}
    </button>
  );
}

/** SIRONIC Design System – Design Tokens */

export const colors = {
  bg: {
    primary: "#0a0a0a",
    secondary: "#111111",
    card: "#1a1a1a",
    cardHover: "#1f1f1f",
    sidebar: "#0f0f0f",
    topbar: "#0a0a0a",
  },
  accent: {
    primary: "#e53935",
    primaryHover: "#c62828",
    primaryMuted: "#7f1d1d",
    badgeBg: "#3b0a0a",
    badgeText: "#e53935",
  },
  text: {
    primary: "#ffffff",
    secondary: "#a0a0a0",
    muted: "#555555",
    accent: "#e53935",
  },
  border: {
    default: "#222222",
    subtle: "#1a1a1a",
    accent: "#e53935",
  },
  status: {
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#e53935",
    info: "#3b82f6",
  },
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  pill: "999px",
} as const;

export const spacing = {
  sidebarWidth: "220px",
  topbarHeight: "52px",
  cardPadding: "24px",
  sectionGap: "24px",
} as const;

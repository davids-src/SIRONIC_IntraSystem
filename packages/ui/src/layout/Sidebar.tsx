"use client";

import * as React from "react";
import { colors, radius, spacing } from "../tokens";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface SidebarUser {
  name: string;
  role: string;
  avatarInitials?: string;
}

export interface SidebarProps {
  appName: string;
  appIcon: React.ReactNode;
  navItems: NavItem[];
  currentPath: string;
  user: SidebarUser;
  onLogout?: () => void;
}

export function Sidebar({
  appName,
  appIcon,
  navItems,
  currentPath,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: spacing.sidebarWidth,
        minWidth: spacing.sidebarWidth,
        background: colors.bg.sidebar,
        borderRight: `1px solid ${colors.border.default}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: spacing.topbarHeight,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 16px",
          borderBottom: `1px solid ${colors.border.default}`,
          flexShrink: 0,
        }}
      >
        <div style={{ color: colors.accent.primary, flexShrink: 0 }}>{appIcon}</div>
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: colors.text.primary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {appName}
        </span>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.key}
            item={item}
            isActive={
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(item.href))
            }
          />
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "12px",
          borderTop: `1px solid ${colors.border.default}`,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px",
            borderRadius: radius.md,
            background: colors.bg.card,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: colors.accent.badgeBg,
              color: colors.accent.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {user.avatarInitials ?? user.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: colors.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.text.muted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.role}
            </div>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "7px",
              background: "transparent",
              border: `1px solid ${colors.border.default}`,
              borderRadius: radius.md,
              color: colors.text.muted,
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                colors.accent.primary;
              (e.currentTarget as HTMLButtonElement).style.color = colors.accent.primary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                colors.border.default;
              (e.currentTarget as HTMLButtonElement).style.color = colors.text.muted;
            }}
          >
            Kijelentkezés
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <a
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 10px",
        borderRadius: radius.md,
        textDecoration: "none",
        fontSize: "0.875rem",
        fontWeight: isActive ? 600 : 400,
        color: isActive
          ? colors.accent.primary
          : hovered
            ? colors.text.primary
            : colors.text.secondary,
        background: isActive
          ? colors.accent.badgeBg
          : hovered
            ? colors.bg.card
            : "transparent",
        borderLeft: isActive
          ? `2px solid ${colors.accent.primary}`
          : "2px solid transparent",
        transition: "background 0.15s, color 0.15s",
        boxSizing: "border-box",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          flexShrink: 0,
          width: "16px",
          height: "16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {item.icon}
      </span>
      {item.label}
    </a>
  );
}

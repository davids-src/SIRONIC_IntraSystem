"use client";

import * as React from "react";
import { colors, spacing } from "../tokens";
import { Sidebar, type SidebarProps } from "./Sidebar";
import { Topbar, type TopbarProps } from "./Topbar";

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: Omit<TopbarProps, "locale" | "onLocaleChange">;
  children: React.ReactNode;
}

export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  const [locale, setLocale] = React.useState<string>(() => {
    if (typeof window === "undefined") return "hu";
    return localStorage.getItem("sironic-locale") ?? "hu";
  });

  const handleLocaleChange = (l: string) => {
    setLocale(l);
    localStorage.setItem("sironic-locale", l);
    document.cookie = `sironic-locale=${l}; path=/; max-age=31536000`;
  };

  // Detect current path for active nav highlight
  const [currentPath, setCurrentPath] = React.useState("/");
  React.useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: colors.bg.primary,
      }}
    >
      <Sidebar {...sidebar} currentPath={currentPath} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        <Topbar {...topbar} locale={locale} onLocaleChange={handleLocaleChange} />
        <main
          style={{
            flex: 1,
            padding: spacing.cardPadding,
            display: "flex",
            flexDirection: "column",
            gap: spacing.sectionGap,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

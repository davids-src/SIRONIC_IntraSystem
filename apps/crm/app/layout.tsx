import type { Metadata } from "next";
import "./globals.css";
import { CrmShell } from "./crm-shell";

export const metadata: Metadata = {
  title: "SIRONIC CRM",
  description: "Belső CRM rendszer – SIRONIC IntraSystem",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>
        <CrmShell>{children}</CrmShell>
      </body>
    </html>
  );
}

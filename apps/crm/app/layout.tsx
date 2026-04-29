import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIRONIC CRM",
  description: "Belső CRM rendszer – SIRONIC IntraSystem",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}

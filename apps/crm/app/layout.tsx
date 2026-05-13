import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SIRONIC CRM",
  description: "Belső CRM rendszer – SIRONIC IntraSystem",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

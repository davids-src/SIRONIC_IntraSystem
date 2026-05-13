import type { Metadata } from "next";
import "./globals.css";
import { PartnerShell } from "./partner-shell";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SIRONIC Partner Portal",
  description: "Partner szervezeti portál – SIRONIC IntraSystem",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" className="dark">
      <body>
        <Providers>
          <PartnerShell>{children}</PartnerShell>
        </Providers>
      </body>
    </html>
  );
}

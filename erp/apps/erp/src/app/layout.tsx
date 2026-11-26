import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@erp/auth";
import { getBranding, brandingMediaUrl } from "@erp/db-core";
import { themeCss } from "@erp/core/theme";
import "@erp/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { PwaServiceWorkerRegister } from "@/components/pwa-service-worker";

/** CRM pages use MongoDB — never prerender at build (CI/Docker have no database). */
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const faviconUrl = brandingMediaUrl(branding.faviconId) ?? "/favicon.ico";
  return {
    title: {
      default: branding.appName,
      template: `%s — ${branding.appName}`,
    },
    description: branding.loginSubtitle,
    applicationName: branding.appName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: branding.appName,
    },
    icons: {
      icon: faviconUrl,
      apple: "/pwa-icon/192",
    },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();
  const session = await auth();

  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        {/* Admin-chosen role colours (Arculat) — built from validated hex values only. */}
        <style
          id="theme-vars"
          dangerouslySetInnerHTML={{ __html: themeCss(branding.theme) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} smart-min-dvh flex flex-col antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <BrandingProvider branding={branding}>
            <SessionProvider session={session}>
              <PwaServiceWorkerRegister />
              {children}
            </SessionProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

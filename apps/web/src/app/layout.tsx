import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { AppFrame, AppFrameFallback } from "@/components/layout/app-frame";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { de } from "@/messages/de";

import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: de.app.name, template: `%s · ${de.app.name}` },
  description: de.app.tagline,
  // iOS ignores most of the manifest: this makes "Zum Home-Bildschirm" open full screen.
  appleWebApp: { capable: true, title: de.app.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the class on <html> before hydration.
    <html
      lang="de"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          {/* The frame depends on the session (sidebar vs. guest header), so it streams. */}
          <Suspense fallback={<AppFrameFallback />}>
            <AppFrame>{children}</AppFrame>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

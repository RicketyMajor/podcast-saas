import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
});

// Display face: optical size + width axes let big titles tighten up.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  // Absolute URLs for metadata (the show's RSS link): prod domain on Vercel.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: { default: "Waves", template: "%s · Waves" },
  description: "Crea, publica y escucha podcasts generados con IA.",
  applicationName: "Waves",
  openGraph: { siteName: "Waves" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      {/* Dark-only in the MVP: `.dark` enables shadcn's `dark:` variants.
          suppressHydrationWarning: browser extensions inject attributes on <html>. */}
      <html
        lang="es"
        className={`dark ${geist.variable} ${bricolage.variable} h-full`}
        suppressHydrationWarning
      >
        <body className="flex min-h-full flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
          {/* No next-themes provider: the app is dark-only. */}
          <Toaster theme="dark" />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}

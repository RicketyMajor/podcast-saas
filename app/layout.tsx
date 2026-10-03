import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Waves", template: "%s · Waves" },
  description: "Crea, publica y escucha podcasts generados con IA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      {/* Dark-only in the MVP: `.dark` enables shadcn's `dark:` variants.
          suppressHydrationWarning: browser extensions inject attributes on <html>. */}
      <html
        lang="es"
        className={`dark ${schibsted.variable} h-full`}
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

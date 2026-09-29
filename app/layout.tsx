import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Ondas",
  description: "Crea, publica y escucha podcasts generados con IA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark-only in the MVP: `.dark` enables shadcn's `dark:` variants.
    <html lang="es" className={`dark ${schibsted.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

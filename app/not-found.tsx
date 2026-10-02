import { Home, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

// Also catches unmatched URLs, so it renders under the root layout only
// (no sidebars or player).
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="self-center">
        <Logo />
      </div>
      <EmptyState
        icon={SearchX}
        title="No encontramos esta página"
        description="Puede que el enlace esté mal escrito o que la página ya no exista."
        action={
          <Button asChild>
            <Link href="/">
              <Home aria-hidden />
              Volver al inicio
            </Link>
          </Button>
        }
      />
    </main>
  );
}

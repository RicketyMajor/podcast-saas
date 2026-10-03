import { Compass, Home } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/layout/AmbientBackdrop";
import { Logo } from "@/components/layout/Logo";
import { PillButton } from "@/components/shared/PillButton";
import { WAVE_BARS } from "@/lib/constants";

export const metadata: Metadata = { title: "Página no encontrada" };

const SILENT_BAR_HEIGHT = 3;

// Also catches unmatched URLs, so it renders under the root layout only
// (no sidebars or player).
export default function NotFound() {
  return (
    <div className="relative isolate flex flex-1 flex-col px-4 py-6 sm:px-10 sm:py-8">
      <AmbientBackdrop />
      <header>
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
        {/* The wave mark, gone silent: its bars settle flat on arrival. */}
        <svg
          aria-hidden
          viewBox="0 0 25 24"
          className="h-24 w-25 text-ambient transition-colors duration-700"
        >
          {WAVE_BARS.map((bar, i) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={(24 - bar.h) / 2}
              width="3"
              height={bar.h}
              rx="1.5"
              fill="currentColor"
              className="origin-center [transform-box:fill-box] motion-safe:animate-[flatline_1.2s_var(--ease-out-expo)_both]"
              style={{
                transform: `scaleY(${SILENT_BAR_HEIGHT / bar.h})`,
                animationDelay: `${150 + i * 70}ms`,
              }}
            />
          ))}
        </svg>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[clamp(2rem,4.4vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance">
            No encontramos esta página
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Puede que el enlace esté mal escrito o que la página ya no exista.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <PillButton asChild>
            <Link href="/">
              <Home aria-hidden />
              Volver al inicio
            </Link>
          </PillButton>
          <PillButton asChild tone="glass">
            <Link href="/discover">
              <Compass aria-hidden />
              Descubrir podcasts
            </Link>
          </PillButton>
        </div>
      </main>
    </div>
  );
}

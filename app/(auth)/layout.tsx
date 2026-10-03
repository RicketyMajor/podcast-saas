import { Sparkles } from "lucide-react";

import { CoverWall } from "@/components/auth/CoverWall";
import { AmbientBackdrop } from "@/components/layout/AmbientBackdrop";
import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate grid flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <AmbientBackdrop />
      <aside className="relative hidden overflow-hidden border-r border-foreground/8 lg:block">
        <CoverWall />
        {/* Graphite veil so the pitch reads over the covers. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-background from-10% via-background/60 via-40% to-transparent to-70%"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-36 bg-linear-to-b from-background/90 to-transparent"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />
          <div className="flex max-w-lg flex-col gap-5">
            <p className="font-display text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance">
              Crea podcasts con IA en minutos
            </p>
            <p className="max-w-sm text-lg text-pretty text-foreground/80">
              Escribe un guion, elige una voz y publica. Sin micrófono.
            </p>
            <p className="flex items-center gap-1.5 text-sm text-foreground/75">
              <Sparkles aria-hidden className="size-4" />
              Voz generada con IA
            </p>
          </div>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center gap-10 px-4 py-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

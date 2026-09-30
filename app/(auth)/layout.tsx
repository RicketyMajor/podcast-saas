import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <Logo />
        <div className="flex flex-col gap-4">
          <p className="text-4xl font-bold tracking-tight text-balance">
            Crea podcasts con IA en minutos
          </p>
          <p className="max-w-sm text-pretty text-muted-foreground">
            Escribe un guion, elige una voz y publica. Sin micrófono.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Voz generada con IA</p>
      </aside>
      <main className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

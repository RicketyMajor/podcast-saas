import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";

// Placeholder home (phase 0). Replaced by the dashboard in later phases.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase">
          <span aria-hidden className="bg-primary size-2 rounded-full" />
          En desarrollo
        </p>
        <h1 className="text-5xl font-bold tracking-tight">Ondas</h1>
        <p className="text-muted-foreground max-w-sm">
          Crea, publica y escucha podcasts generados con IA.
        </p>
      </div>
      <Button size="lg" type="button">
        <Mic aria-hidden />
        Crear podcast
      </Button>
    </main>
  );
}

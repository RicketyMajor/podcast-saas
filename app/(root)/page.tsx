import { Mic } from "lucide-react";
import Link from "next/link";

import { TrendingCount } from "@/components/podcast/TrendingCount";
import { Button } from "@/components/ui/button";

// Placeholder home; phase 7 replaces it with trending and latest podcasts.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          <span aria-hidden className="size-2 rounded-full bg-primary" />
          En desarrollo
        </p>
        <h1 className="text-5xl font-bold tracking-tight">Waves</h1>
        <p className="max-w-sm text-muted-foreground">
          Crea, publica y escucha podcasts generados con IA.
        </p>
        <TrendingCount />
      </div>
      <Button asChild size="lg">
        <Link href="/create-podcast">
          <Mic aria-hidden />
          Crear podcast
        </Link>
      </Button>
    </div>
  );
}

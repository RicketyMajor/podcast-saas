"use client";

import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

// Phase 1 smoke test of a reactive query; replaced by the trending grid in phase 7.
export function TrendingCount() {
  const podcasts = useQuery(api.podcasts.getTrending, {});

  if (podcasts === undefined) {
    return <Skeleton className="h-5 w-24" aria-label="Cargando podcasts" />;
  }

  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {podcasts.length} {podcasts.length === 1 ? "podcast" : "podcasts"}
    </p>
  );
}

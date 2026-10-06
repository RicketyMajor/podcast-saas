"use client";

import { Rss } from "lucide-react";
import { toast } from "sonner";

import { PillButton } from "@/components/shared/PillButton";
import { feedPath } from "@/lib/feed/rss";

// Glass: "Reproducir" stays the one ivory action.
export function CopyFeedButton({ showId }: { showId: string }) {
  async function copy() {
    const url = `${window.location.origin}${feedPath(showId)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace del feed copiado. Pégalo en tu app de podcasts.");
    } catch {
      toast.error(`No pudimos copiarlo. Este es el enlace: ${url}`);
    }
  }
  return (
    <PillButton tone="glass" onClick={copy}>
      <Rss aria-hidden />
      Copiar enlace RSS
    </PillButton>
  );
}

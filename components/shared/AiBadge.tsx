import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

// ponytail: the player and the hero say "Voz" (cards carry no hosts); add a
// twoVoices flag to podcastCard if that matters.
export function AiBadge({
  className,
  plural = false,
}: {
  className?: string;
  /** Two voices: a conversation. */
  plural?: boolean;
}) {
  const label = plural ? "Voces generadas con IA" : "Voz generada con IA";
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/85 backdrop-blur-md",
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3" />
      <span aria-hidden>IA</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

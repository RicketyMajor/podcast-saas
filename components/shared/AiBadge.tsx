import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const LABEL = "Voz generada con IA";

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      title={LABEL}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/85 backdrop-blur-md",
        className,
      )}
    >
      <Sparkles aria-hidden className="size-3" />
      <span aria-hidden>IA</span>
      <span className="sr-only">{LABEL}</span>
    </span>
  );
}

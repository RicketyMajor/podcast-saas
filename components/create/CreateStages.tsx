"use client";

import { Check, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export type StageStatus = "done" | "stale" | "todo";

export type Stage = {
  /** id of the section the stage scrolls to */
  target: string;
  label: string;
  status: StageStatus;
};

const STATUS_TEXT: Record<StageStatus, string> = {
  done: "lista",
  stale: "desactualizada",
  todo: "pendiente",
};

/** The first stage not done (else the last): only its action is ivory. */
export function currentStage(stages: Stage[]) {
  const firstOpen = stages.findIndex((s) => s.status !== "done");
  return firstOpen === -1 ? stages.length - 1 : firstOpen;
}

/**
 * Sticky rail over the create form: one item per stage with its status. The
 * current stage (first one not done) carries a pill that glides forward as
 * the form fills in; clicking an item scrolls to its section.
 */
export function CreateStages({ stages }: { stages: Stage[] }) {
  const current = currentStage(stages);

  function goTo(event: React.MouseEvent, target: string) {
    const section = document.getElementById(target);
    if (!section) return;
    event.preventDefault();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    section.focus({ preventScroll: true });
  }

  return (
    <nav
      aria-label="Etapas"
      className="sticky top-18 z-20 rounded-2xl bg-background/70 p-1.5 ring-1 ring-foreground/10 backdrop-blur-2xl backdrop-saturate-150 sm:rounded-full lg:top-3"
    >
      <ol className="grid grid-cols-4 gap-1">
        {stages.map((stage, i) => {
          const isCurrent = i === current;
          return (
            <li key={stage.target} className="relative">
              {isCurrent && (
                <motion.span
                  layoutId="create-stage"
                  aria-hidden
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-xl bg-foreground/10 ring-1 ring-foreground/8 sm:rounded-full"
                />
              )}
              <a
                href={`#${stage.target}`}
                onClick={(event) => goTo(event, stage.target)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-row sm:gap-2 sm:rounded-full sm:text-sm",
                  isCurrent && "text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums ring-1 transition-colors duration-300",
                    stage.status === "done"
                      ? "bg-foreground text-background ring-foreground"
                      : isCurrent
                        ? "text-ambient ring-ambient"
                        : "ring-foreground/20",
                  )}
                >
                  {stage.status === "done" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : stage.status === "stale" ? (
                    <TriangleAlert className="size-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                {stage.label}
                <span className="sr-only">, {STATUS_TEXT[stage.status]}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

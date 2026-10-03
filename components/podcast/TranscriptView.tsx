"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ~12 lines at leading-7 (1.75rem each).
const COLLAPSED = "max-h-84";

export function TranscriptView({ transcript }: { transcript: string }) {
  const textRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [transcript, expanded]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast.success("Transcripción copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto a mano.");
    }
  }

  return (
    <section
      aria-labelledby="transcript-title"
      className="flex flex-col gap-4 rounded-3xl bg-card/60 p-5 ring-1 ring-foreground/8 backdrop-blur-md sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="transcript-title"
          className="text-[1.375rem] font-bold tracking-tight"
        >
          Transcripción
        </h2>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copiar
        </Button>
      </div>
      <div
        id="transcript-text"
        ref={textRef}
        className={cn(
          "flex max-w-prose flex-col gap-4 overflow-hidden text-[1.0625rem] leading-7 text-pretty text-foreground/90",
          !expanded && COLLAPSED,
          !expanded && overflows && "mask-b-from-60% mask-b-to-100%",
        )}
      >
        {transcript.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      {(overflows || expanded) && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={expanded}
          aria-controls="transcript-text"
          onClick={() => setExpanded((e) => !e)}
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "transition-transform duration-300 ease-out-expo",
              expanded && "rotate-180",
            )}
          />
          {expanded ? "Ver menos" : "Ver completa"}
        </Button>
      )}
    </section>
  );
}

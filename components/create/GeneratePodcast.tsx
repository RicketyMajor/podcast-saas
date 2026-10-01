"use client";

import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { AudioLines, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SCRIPT_MAX_CHARS, SCRIPT_MIN_CHARS } from "@/convex/lib/limits";
import { formatCount, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import {
  podcastFormSchema,
  type PodcastFormValues,
} from "@/lib/validations/podcast";

export type AudioSource = Pick<
  PodcastFormValues,
  "script" | "languageCode" | "voiceName" | "speakingRate"
>;

export type GeneratedAudio = {
  storageId?: Id<"_storage">; // undefined = the published file, unchanged
  url: string;
  durationSec: number;
  source: AudioSource;
};

const GENERIC_ERROR = "Algo salió mal. Inténtalo de nuevo.";

export function sameSource(a: AudioSource, b: AudioSource) {
  return (
    a.script.trim() === b.script.trim() &&
    a.languageCode === b.languageCode &&
    a.voiceName === b.voiceName &&
    a.speakingRate === b.speakingRate
  );
}

export function GeneratePodcast({
  control,
  audio,
  onAudioChange,
}: {
  control: Control<PodcastFormValues>;
  audio: GeneratedAudio | null;
  onAudioChange: (audio: GeneratedAudio) => void;
}) {
  const generateAudio = useAction(api.ai.actions.generateAudio);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [script, languageCode, voiceName, speakingRate] = useWatch({
    control,
    name: ["script", "languageCode", "voiceName", "speakingRate"],
  });
  const source: AudioSource = { script, languageCode, voiceName, speakingRate };
  const canGenerate =
    podcastFormSchema.shape.script.safeParse(script).success &&
    podcastFormSchema.shape.voiceName.safeParse(voiceName).success;
  const stale = audio !== null && !sameSource(audio.source, source);

  async function handleGenerate() {
    setPending(true);
    setError(null);
    try {
      const result = await generateAudio({
        script: script.trim(),
        languageCode,
        voiceName,
        speakingRate: Number(speakingRate),
      });
      onAudioChange({ ...result, source });
      toast.success("Audio generado.");
    } catch (err) {
      const message =
        err instanceof ConvexError
          ? String((err.data as { message?: string }).message ?? GENERIC_ERROR)
          : GENERIC_ERROR;
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
      {audio ? (
        <div className="flex flex-col gap-3">
          <audio
            controls
            preload="metadata"
            src={audio.url}
            // The only other <audio> allowed: it pauses the global player.
            onPlay={() => usePlayerStore.getState().pause()}
            className="w-full [color-scheme:dark]"
            aria-label="Vista previa del audio"
          />
          <p className="text-sm text-muted-foreground">
            Duración:{" "}
            <span className="text-foreground tabular-nums">
              {formatDuration(audio.durationSec)}
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AudioLines aria-hidden className="size-5" />
          </span>
          <p className="text-sm text-pretty text-muted-foreground">
            Convertiremos tu guion en voz con el idioma, la voz y la velocidad
            que elegiste.
          </p>
        </div>
      )}

      {stale && !pending && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          El audio ya no coincide con el guion. Vuelve a generarlo.
        </p>
      )}

      {error && !pending && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant={audio && !stale ? "outline" : "default"}
          className="h-10"
          disabled={!canGenerate || pending}
          onClick={handleGenerate}
        >
          {pending ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : audio ? (
            <RefreshCw aria-hidden />
          ) : (
            <AudioLines aria-hidden />
          )}
          {pending ? "Generando audio…" : audio ? "Regenerar" : "Generar audio"}
        </Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {pending
            ? "Puede tardar hasta un minuto."
            : !canGenerate
              ? `Escribe un guion de ${formatCount(SCRIPT_MIN_CHARS)} a ${formatCount(SCRIPT_MAX_CHARS)} caracteres para generar el audio.`
              : null}
        </p>
      </div>
    </div>
  );
}

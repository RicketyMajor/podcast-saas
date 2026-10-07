"use client";

import { useAction } from "convex/react";
import { AudioLines, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";

import { GenerationProgress } from "@/components/create/GenerationProgress";
import { QuotaNote } from "@/components/create/QuotaNote";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SCRIPT_MAX_CHARS, SCRIPT_MIN_CHARS } from "@/convex/lib/limits";
import { errorMessage, formatCount, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import {
  conversationIssues,
  hostsOf,
  podcastFormSchema,
  type PodcastFormValues,
} from "@/lib/validations/podcast";

export type AudioSource = Pick<
  PodcastFormValues,
  | "script"
  | "languageCode"
  | "voiceName"
  | "speakingRate"
  | "spokenDisclosure"
  | "format"
  | "voice2Name"
  | "hostNames"
>;

export type GeneratedAudio = {
  storageId?: Id<"_storage">; // undefined = the published file, unchanged
  url: string;
  durationSec: number;
  source: AudioSource;
};

// ponytail: rough fit of TTS time vs. script length (~1 min of speech ≈
// 900 chars ≈ 15 s); tune it if real generations drift from the estimate.
const audioEstimateMs = (chars: number) => 4000 + chars * 12;

export function sameSource(a: AudioSource, b: AudioSource) {
  return (
    a.script.trim() === b.script.trim() &&
    a.languageCode === b.languageCode &&
    a.voiceName === b.voiceName &&
    a.speakingRate === b.speakingRate &&
    a.spokenDisclosure === b.spokenDisclosure &&
    a.format === b.format &&
    // Voice 2 and the names only exist in a conversation.
    (a.format === "narration" ||
      (a.voice2Name === b.voice2Name &&
        a.hostNames[0].trim() === b.hostNames[0].trim() &&
        a.hostNames[1].trim() === b.hostNames[1].trim()))
  );
}

export function GeneratePodcast({
  control,
  audio,
  onAudioChange,
  primary,
}: {
  control: Control<PodcastFormValues>;
  audio: GeneratedAudio | null;
  onAudioChange: (audio: GeneratedAudio) => void;
  /** Ivory only while this is the rail's current stage. */
  primary: boolean;
}) {
  const generateAudio = useAction(api.ai.actions.generateAudio);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [
    script,
    languageCode,
    voiceName,
    speakingRate,
    spokenDisclosure,
    format,
    voice2Name,
    hostNames,
  ] = useWatch({
    control,
    name: [
      "script",
      "languageCode",
      "voiceName",
      "speakingRate",
      "spokenDisclosure",
      "format",
      "voice2Name",
      "hostNames",
    ],
  });
  const source: AudioSource = {
    script,
    languageCode,
    voiceName,
    speakingRate,
    spokenDisclosure,
    format,
    voice2Name,
    hostNames,
  };
  const scriptReady = podcastFormSchema.shape.script.safeParse(script).success;
  const canGenerate =
    scriptReady &&
    conversationIssues(source).length === 0 &&
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
        spokenDisclosure,
        hosts: hostsOf(source),
      });
      onAudioChange({ ...result, source });
      toast.success("Audio generado.");
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card/60 p-4 ring-1 ring-foreground/8 sm:p-6">
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
            Convertiremos tu guion en voz con el idioma,{" "}
            {format === "conversation" ? "las dos voces" : "la voz"} y la
            velocidad que elegiste.
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant={primary ? "default" : "outline"}
          className="h-11 rounded-full px-5 transition-transform active:scale-95"
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
        {!pending && (
          <p className="text-sm text-muted-foreground">
            {!scriptReady ? (
              `Escribe un guion de ${formatCount(SCRIPT_MIN_CHARS)} a ${formatCount(SCRIPT_MAX_CHARS)} caracteres para generar el audio.`
            ) : !canGenerate ? (
              "Revisa las voces, los nombres y el guion de la conversación."
            ) : (
              <QuotaNote kind="audio" />
            )}
          </p>
        )}
      </div>
      {pending && (
        <GenerationProgress
          estimateMs={audioEstimateMs(script.trim().length)}
          phases={[
            "Leyendo el guion…",
            "Dando voz a tu guion…",
            "Uniendo las partes del audio…",
            "Últimos retoques…",
          ]}
        />
      )}
    </div>
  );
}

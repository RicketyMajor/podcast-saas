"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  SCRIPT_MAX_CHARS,
  SCRIPT_MIN_CHARS,
  SPEAKING_RATES,
} from "../lib/limits";
import { chunkScript, concatPcm, encodeMp3 } from "./audio";
import { AUDIO_OUTPUT, GOOGLE_TTS } from "./config";
import { googleTts } from "./providers/googleTts";
import { LANGUAGES, VOICES, voiceId } from "./voices";

function invalid(
  message: string,
): ConvexError<{ code: string; message: string }> {
  return new ConvexError({ code: "VALIDATION", message });
}

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) return String(error.data.message);
  return error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
}

// Order (rules/ai.md): identity → quota → provider → storage → log → response.
// Validation runs before the quota so bad input doesn't spend a reservation.
export const generateAudio = action({
  args: {
    script: v.string(),
    languageCode: v.string(),
    voiceName: v.string(),
    speakingRate: v.number(),
  },
  returns: v.object({
    storageId: v.id("_storage"),
    url: v.string(),
    durationSec: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Inicia sesión para continuar.",
      });
    }

    const script = args.script.trim();
    if (script.length < SCRIPT_MIN_CHARS || script.length > SCRIPT_MAX_CHARS) {
      const count = new Intl.NumberFormat("es", { useGrouping: "always" });
      throw invalid(
        `El guion debe tener entre ${count.format(SCRIPT_MIN_CHARS)} y ${count.format(SCRIPT_MAX_CHARS)} caracteres.`,
      );
    }
    if (!LANGUAGES.some((l) => l.code === args.languageCode)) {
      throw invalid("Idioma no disponible.");
    }
    if (!VOICES.some((voice) => voice.name === args.voiceName)) {
      throw invalid("Voz no disponible.");
    }
    if (!(SPEAKING_RATES as readonly number[]).includes(args.speakingRate)) {
      throw invalid("Velocidad no disponible.");
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_TTS_API_KEY is not set");
      throw new ConvexError({
        code: "AI_FAILED",
        message: "La generación de audio no está disponible ahora mismo.",
      });
    }

    const generationId = await ctx.runMutation(
      internal.ai.generations.reserveGeneration,
      {
        userId,
        kind: "audio",
        provider: GOOGLE_TTS.provider,
        model: GOOGLE_TTS.model,
        inputChars: script.length,
        estimatedCostUsd: script.length * GOOGLE_TTS.usdPerChar,
      },
    );

    try {
      const tts = googleTts(apiKey);
      // Parallel: Promise.all keeps part order; every part uses the same voice
      // and pace. ponytail: ~4 concurrent requests (limit: 200/min); cap the
      // fan-out if SCRIPT_MAX_CHARS grows.
      const chunkBytes = Math.min(
        GOOGLE_TTS.chunkBytes,
        tts.maxBytesPerRequest,
      );
      const parts = await Promise.all(
        chunkScript(script, chunkBytes).map(async (text) => {
          const pcm = await tts.synthesize({
            text,
            voiceId: voiceId(args.languageCode, args.voiceName),
            languageCode: args.languageCode,
            speakingRate: args.speakingRate,
          });
          return pcm.samples;
        }),
      );

      const gapSamples = Math.round(
        (GOOGLE_TTS.sampleRate * AUDIO_OUTPUT.gapMs) / 1000,
      );
      const samples = concatPcm(parts, gapSamples);
      const mp3 = encodeMp3(
        samples,
        GOOGLE_TTS.sampleRate,
        AUDIO_OUTPUT.mp3Kbps,
      );
      const durationSec = samples.length / GOOGLE_TTS.sampleRate;

      const storageId = await ctx.storage.store(
        new Blob([mp3], { type: "audio/mpeg" }),
      );
      const url = await ctx.storage.getUrl(storageId);
      if (url === null) throw new Error("Stored audio has no URL");

      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: { status: "success", storageId, outputSeconds: durationSec },
      });
      console.log(
        `audio ok: ${script.length} chars, ${parts.length} parts, ${durationSec.toFixed(1)} s, ${mp3.length} bytes`,
      );
      return { storageId, url, durationSec };
    } catch (error) {
      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: { status: "error", errorMessage: errorMessage(error) },
      });
      if (error instanceof ConvexError) throw error;
      console.error(`audio failed: ${errorMessage(error)}`);
      throw new ConvexError({
        code: "AI_FAILED",
        message: "No pudimos generar el audio. Inténtalo de nuevo.",
      });
    }
  },
});

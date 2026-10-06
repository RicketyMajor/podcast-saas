"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { action, type ActionCtx } from "../_generated/server";
import {
  IMAGE_PROMPT_MAX_CHARS,
  IMAGE_PROMPT_MIN_CHARS,
  SCRIPT_MAX_CHARS,
  SCRIPT_MIN_CHARS,
  SCRIPT_MINUTES,
  SCRIPT_TONES,
  SCRIPT_TOPIC_MAX_CHARS,
  SCRIPT_TOPIC_MIN_CHARS,
  SPEAKING_RATES,
} from "../lib/limits";
import type { Turn } from "../lib/dialogue";
import { tidyScript } from "../lib/text";
import { checkDialogue, hostInput } from "../lib/validation";
import { chunkScript, concatPcm, encodeMp3, mapLimit } from "./audio";
import {
  AUDIO_OUTPUT,
  CLOUDFLARE_IMAGE,
  GEMINI_TEXT,
  GOOGLE_TTS,
} from "./config";
import { cloudflareImage } from "./providers/cloudflareImage";
import { geminiText } from "./providers/geminiText";
import { googleTts } from "./providers/googleTts";
import { disclosureOf, LANGUAGES, VOICES, voiceId } from "./voices";

function invalid(
  message: string,
): ConvexError<{ code: string; message: string }> {
  return new ConvexError({ code: "VALIDATION", message });
}

function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) return String(error.data.message);
  return error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
}

async function requireUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Inicia sesión para continuar.",
    });
  }
  return userId;
}

function requireEnv(name: string, feature: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set`);
    throw new ConvexError({
      code: "AI_FAILED",
      message: `La generación de ${feature} no está disponible ahora mismo.`,
    });
  }
  return value;
}

// Order (rules/ai.md): identity → quota → provider → storage → log → response.
// Validation runs before the quota so bad input doesn't spend a reservation.
export const generateAudio = action({
  args: {
    script: v.string(),
    languageCode: v.string(),
    voiceName: v.string(),
    speakingRate: v.number(),
    // Optional so a tab still running the previous client keeps working.
    spokenDisclosure: v.optional(v.boolean()),
    // Two named hosts = a conversation (phase 21); absent = narration.
    hosts: v.optional(v.array(hostInput)),
  },
  returns: v.object({
    storageId: v.id("_storage"),
    url: v.string(),
    durationSec: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

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
    const dialogue = checkDialogue(script, args.voiceName, args.hosts);
    // What gets voiced, in order: the whole script, or one turn per host
    // line. Names are labels: never voiced, never billed.
    const segments: Turn[] = dialogue?.turns ?? [{ speaker: 0, text: script }];

    const apiKey = requireEnv("GOOGLE_TTS_API_KEY", "audio");
    // Not part of the script's 5,000-char limit, but voiced and billed.
    const notice = args.spokenDisclosure ? disclosureOf(args.languageCode) : "";
    const spokenChars =
      notice.length + segments.reduce((sum, s) => sum + s.text.length, 0);

    const generationId = await ctx.runMutation(
      internal.ai.generations.reserveGeneration,
      {
        userId,
        kind: "audio",
        provider: GOOGLE_TTS.provider,
        model: GOOGLE_TTS.model,
        inputChars: spokenChars,
        estimatedCostUsd: spokenChars * GOOGLE_TTS.usdPerChar,
        spokenDisclosure: notice !== "",
      },
    );

    try {
      const tts = googleTts(apiKey);
      const chunkBytes = Math.min(
        GOOGLE_TTS.chunkBytes,
        tts.maxBytesPerRequest,
      );
      const voiceOf = (speaker: Turn["speaker"]) =>
        voiceId(
          args.languageCode,
          dialogue?.hosts[speaker].voiceName ?? args.voiceName,
        );
      const parts = [
        // The notice opens the audio in the first voice, then the usual gap.
        ...(notice ? [{ text: notice, voiceId: voiceOf(0) }] : []),
        ...segments.flatMap((s) =>
          chunkScript(s.text, chunkBytes).map((text) => ({
            text,
            voiceId: voiceOf(s.speaker),
          })),
        ),
      ];
      const started = Date.now();
      // Same pace for every part; at most maxConcurrent requests at once.
      const pcm = await mapLimit(
        parts,
        GOOGLE_TTS.maxConcurrent,
        async (part) => {
          const { samples } = await tts.synthesize({
            ...part,
            languageCode: args.languageCode,
            speakingRate: args.speakingRate,
          });
          return samples;
        },
      );
      const synthSec = (Date.now() - started) / 1000;

      const gapSamples = Math.round(
        (GOOGLE_TTS.sampleRate * AUDIO_OUTPUT.gapMs) / 1000,
      );
      const samples = concatPcm(pcm, gapSamples);
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
        `audio ok: ${spokenChars} chars${notice ? " (with notice)" : ""}${dialogue ? `, ${dialogue.turns.length} turns` : ""}, ${parts.length} parts in ${synthSec.toFixed(1)} s, ${durationSec.toFixed(1)} s of audio, ${mp3.length} bytes`,
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

export const generateScript = action({
  args: {
    topic: v.string(),
    languageCode: v.string(),
    minutes: v.number(),
    tone: v.string(),
  },
  returns: v.object({ script: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const topic = args.topic.trim();
    if (
      topic.length < SCRIPT_TOPIC_MIN_CHARS ||
      topic.length > SCRIPT_TOPIC_MAX_CHARS
    ) {
      throw invalid(
        `El tema debe tener entre ${SCRIPT_TOPIC_MIN_CHARS} y ${SCRIPT_TOPIC_MAX_CHARS} caracteres.`,
      );
    }
    const language = LANGUAGES.find((l) => l.code === args.languageCode);
    if (!language) throw invalid("Idioma no disponible.");
    if (!(SCRIPT_MINUTES as readonly number[]).includes(args.minutes)) {
      throw invalid("Duración no disponible.");
    }
    if (!(SCRIPT_TONES as readonly string[]).includes(args.tone)) {
      throw invalid("Tono no disponible.");
    }

    const apiKey = requireEnv("GEMINI_API_KEY", "guiones");

    const generationId = await ctx.runMutation(
      internal.ai.generations.reserveGeneration,
      {
        userId,
        kind: "script",
        provider: GEMINI_TEXT.provider,
        model: GEMINI_TEXT.model,
        inputChars: topic.length,
        estimatedCostUsd: 0, // known after the call (token usage)
      },
    );

    try {
      const result = await geminiText(apiKey).generateScript({
        topic,
        languageLabel: language.label,
        targetMinutes: args.minutes,
        tone: args.tone,
      });
      const script = tidyScript(result.script, SCRIPT_MAX_CHARS);
      if (script.length < SCRIPT_MIN_CHARS) throw new Error("Script too short");

      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: {
          status: "success",
          estimatedCostUsd:
            result.inputTokens * GEMINI_TEXT.usdPerInputToken +
            result.outputTokens * GEMINI_TEXT.usdPerOutputToken,
        },
      });
      console.log(
        `script ok: ${result.inputTokens} in / ${result.outputTokens} out tokens, ${script.length} chars`,
      );
      return { script };
    } catch (error) {
      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: { status: "error", errorMessage: errorMessage(error) },
      });
      if (error instanceof ConvexError) throw error;
      console.error(`script failed: ${errorMessage(error)}`);
      throw new ConvexError({
        code: "AI_FAILED",
        message: "No pudimos generar el guion. Inténtalo de nuevo.",
      });
    }
  },
});

export const generateThumbnail = action({
  args: { prompt: v.string() },
  returns: v.object({ storageId: v.id("_storage"), url: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const prompt = args.prompt.trim();
    if (
      prompt.length < IMAGE_PROMPT_MIN_CHARS ||
      prompt.length > IMAGE_PROMPT_MAX_CHARS
    ) {
      const count = new Intl.NumberFormat("es", { useGrouping: "always" });
      throw invalid(
        `La descripción debe tener entre ${IMAGE_PROMPT_MIN_CHARS} y ${count.format(IMAGE_PROMPT_MAX_CHARS)} caracteres.`,
      );
    }

    const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID", "portadas");
    const apiToken = requireEnv("CLOUDFLARE_API_TOKEN", "portadas");

    const generationId = await ctx.runMutation(
      internal.ai.generations.reserveGeneration,
      {
        userId,
        kind: "image",
        provider: CLOUDFLARE_IMAGE.provider,
        model: CLOUDFLARE_IMAGE.model,
        inputChars: prompt.length,
        estimatedCostUsd: CLOUDFLARE_IMAGE.usdPerImage,
      },
    );

    try {
      const image = await cloudflareImage(accountId, apiToken).generate({
        prompt,
      });
      const storageId = await ctx.storage.store(
        new Blob([image.bytes], { type: image.mimeType }),
      );
      const url = await ctx.storage.getUrl(storageId);
      if (url === null) throw new Error("Stored image has no URL");

      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: { status: "success", storageId },
      });
      console.log(
        `image ok: ${prompt.length} chars, ${image.bytes.length} bytes`,
      );
      return { storageId, url };
    } catch (error) {
      await ctx.runMutation(internal.ai.generations.finishGeneration, {
        generationId,
        outcome: { status: "error", errorMessage: errorMessage(error) },
      });
      if (error instanceof ConvexError) throw error;
      console.error(`image failed: ${errorMessage(error)}`);
      throw new ConvexError({
        code: "AI_FAILED",
        message: "No pudimos generar la portada. Inténtalo de nuevo.",
      });
    }
  },
});

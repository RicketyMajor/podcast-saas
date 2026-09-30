"use node";

import { ConvexError } from "convex/values";

import { GOOGLE_TTS } from "../config";
import { errorDetail, fetchWithRetry } from "./http";
import type { Pcm16, TtsProvider } from "./types";

const BLOCKED = /sensitive|safety|blocked|inappropriate|harm/i;

const aiFailed = () =>
  new ConvexError({
    code: "AI_FAILED",
    message: "No pudimos generar el audio. Inténtalo de nuevo.",
  });

/** Returns the samples of the WAV "data" chunk (header size isn't fixed). */
function wavToPcm16(wav: Buffer): Int16Array {
  let offset = 12; // "RIFF" <size> "WAVE"
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    offset += 8;
    if (id === "data") {
      const end = Math.min(offset + size, wav.length);
      // Copy into a fresh buffer: Int16Array needs an even byte offset.
      const bytes = wav.buffer.slice(
        wav.byteOffset + offset,
        wav.byteOffset + end - ((end - offset) % 2),
      );
      return new Int16Array(bytes);
    }
    offset += size + (size % 2); // chunks are word-aligned
  }
  throw new Error("Cloud TTS returned WAV without a data chunk");
}

export function googleTts(apiKey: string): TtsProvider {
  return {
    id: "google",
    maxBytesPerRequest: GOOGLE_TTS.maxBytesPerRequest,
    async synthesize({ text, voiceId, languageCode, speakingRate }) {
      const body = JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceId },
        // Chirp 3 HD rejects headerless "PCM"; LINEAR16 comes wrapped in WAV.
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: GOOGLE_TTS.sampleRate,
          speakingRate,
        },
      });

      let res: Response;
      try {
        res = await fetchWithRetry(GOOGLE_TTS.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "x-goog-api-key": apiKey,
          },
          body,
        });
      } catch {
        throw aiFailed();
      }

      if (res.ok) {
        const { audioContent } = (await res.json()) as { audioContent: string };
        return {
          samples: wavToPcm16(Buffer.from(audioContent, "base64")),
          sampleRate: 24000,
        } satisfies Pcm16;
      }

      // Log status and provider message only; never request bodies or audio.
      const detail = await errorDetail(res);
      console.error(`Cloud TTS ${res.status}: ${detail}`);
      if (res.status === 400 && BLOCKED.test(detail)) {
        throw new ConvexError({
          code: "AI_BLOCKED",
          message:
            "El proveedor de IA no pudo procesar este contenido. Prueba con otro texto.",
        });
      }
      if (res.status === 429) {
        throw new ConvexError({
          code: "QUOTA_EXCEEDED",
          message:
            "El servicio de voz está saturado en este momento. Inténtalo en unos minutos.",
        });
      }
      throw aiFailed();
    },
  };
}

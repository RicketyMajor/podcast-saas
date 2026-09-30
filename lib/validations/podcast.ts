import { z } from "zod";

import { LANGUAGES, VOICES } from "@/convex/ai/voices";
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  SCRIPT_MAX_CHARS,
  SCRIPT_MIN_CHARS,
  SPEAKING_RATES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
  UPLOAD_MAX_MB,
} from "@/convex/lib/limits";
import { formatCount } from "@/lib/utils";

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} debe tener al menos ${formatCount(min)} caracteres.`)
    .max(max, `${label} no puede superar ${formatCount(max)} caracteres.`);

export const podcastFormSchema = z.object({
  title: text("El título", TITLE_MIN_CHARS, TITLE_MAX_CHARS),
  description: text(
    "La descripción",
    DESCRIPTION_MIN_CHARS,
    DESCRIPTION_MAX_CHARS,
  ),
  languageCode: z.enum(
    LANGUAGES.map((l) => l.code),
    { error: "Elige un idioma." },
  ),
  voiceName: z.enum(
    VOICES.map((v) => v.name),
    { error: "Elige una voz." },
  ),
  // Radix Select works with strings; converted to a number on submit.
  speakingRate: z.enum(SPEAKING_RATES.map(String)),
  script: text("El guion", SCRIPT_MIN_CHARS, SCRIPT_MAX_CHARS),
});

export type PodcastFormValues = z.infer<typeof podcastFormSchema>;

export const COVER_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Checks a manual cover before it reaches Convex; returns an error or null. */
export function coverFileError(file: { type: string; size: number }) {
  if (!COVER_TYPES.includes(file.type)) {
    return "Formato no admitido. Sube una imagen PNG, JPG o WebP.";
  }
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) {
    return `La imagen pesa más de ${UPLOAD_MAX_MB} MB. Elige una más liviana.`;
  }
  return null;
}

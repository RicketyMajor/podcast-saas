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

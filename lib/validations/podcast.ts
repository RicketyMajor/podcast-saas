import { z } from "zod";

import { LANGUAGES, VOICES } from "@/convex/ai/voices";
import {
  hostNameError,
  parseDialogue,
  sameName,
} from "@/convex/lib/dialogue";
import {
  COVER_TYPES,
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

export const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} debe tener al menos ${formatCount(min)} caracteres.`)
    .max(max, `${label} no puede superar ${formatCount(max)} caracteres.`);

export const FORMATS = ["narration", "conversation"] as const;

const voice = z.enum(
  VOICES.map((v) => v.name),
  { error: "Elige una voz." },
);

const fields = z.object({
  showId: z.string().min(1, "Elige un show."),
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
  // Narration: the voice. Conversation: voice 1 (voice2Name is voice 2).
  voiceName: voice,
  // Radix Select works with strings; converted to a number on submit.
  speakingRate: z.enum(SPEAKING_RATES.map(String)),
  script: text("El guion", SCRIPT_MIN_CHARS, SCRIPT_MAX_CHARS),
  // Voice the AI notice first (Apple §1.11); the server records what it did.
  spokenDisclosure: z.boolean(),
  format: z.enum(FORMATS),
  voice2Name: voice,
  // Kept in narration too, so switching formats loses nothing.
  hostNames: z.tuple([z.string(), z.string()]),
});

export type ConversationFields = Pick<
  z.infer<typeof fields>,
  "format" | "script" | "voiceName" | "voice2Name" | "hostNames"
>;

/** Conversation-only problems, by field; the server repeats these checks. */
export function conversationIssues(values: ConversationFields) {
  const issues: { path: (string | number)[]; message: string }[] = [];
  if (values.format !== "conversation") return issues;
  values.hostNames.forEach((name, i) => {
    const message = hostNameError(name);
    if (message) issues.push({ path: ["hostNames", i], message });
  });
  if (issues.length === 0 && sameName(...values.hostNames)) {
    issues.push({
      path: ["hostNames", 1],
      message: "Usa dos nombres distintos.",
    });
  }
  if (values.voiceName === values.voice2Name) {
    issues.push({ path: ["voice2Name"], message: "Elige dos voces distintas." });
  }
  // The script is only checked against usable names.
  if (issues.every((issue) => issue.path[0] !== "hostNames")) {
    const dialogue = parseDialogue(values.script, values.hostNames);
    if (!dialogue.ok) {
      issues.push({ path: ["script"], message: dialogue.error });
    }
  }
  return issues;
}

export const podcastFormSchema = fields.superRefine((values, ctx) => {
  for (const issue of conversationIssues(values)) {
    ctx.addIssue({ code: "custom", ...issue });
  }
});

export type PodcastFormValues = z.infer<typeof podcastFormSchema>;

/** What generateAudio and create/update take: undefined = narration. */
export function hostsOf(values: ConversationFields) {
  return values.format === "conversation"
    ? [
        { name: values.hostNames[0].trim(), voiceName: values.voiceName },
        { name: values.hostNames[1].trim(), voiceName: values.voice2Name },
      ]
    : undefined;
}

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

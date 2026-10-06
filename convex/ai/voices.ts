// Chirp 3 HD voices chosen on 2026-09-30 (phase 5): Charon picked by ear by the
// owner; the rest from Google's voice descriptors, for variety. All exist in
// every locale below (checked against the voices API). The id is built from the
// language: "es-US" + "Charon" → "es-US-Chirp3-HD-Charon".
// Samples: public/voices/<lang>-<Voice>.mp3 (scripts/voice-samples.mjs).

// Spoken at the start of an episode when its author keeps the notice on:
// Apple wants AI voices disclosed "in the content and metadata" (§1.11).
// Plural so it also fits a two-voice conversation (phase 21).
const ES_DISCLOSURE =
  "Este episodio fue creado con voces generadas por inteligencia artificial.";

// Locales with Chirp 3 HD voices (docs/screens.md §2.3). Labels are UI text.
export const LANGUAGES = [
  {
    code: "es-US",
    label: "Español (Latinoamérica)",
    disclosure: ES_DISCLOSURE,
  },
  { code: "es-ES", label: "Español (España)", disclosure: ES_DISCLOSURE },
  {
    code: "en-US",
    label: "Inglés (EE. UU.)",
    disclosure: "This episode was created with AI-generated voices.",
  },
  {
    code: "pt-BR",
    label: "Portugués (Brasil)",
    disclosure:
      "Este episódio foi criado com vozes geradas por inteligência artificial.",
  },
] as const;

/** The spoken AI notice for a language ("" if Waves doesn't offer it). */
export function disclosureOf(languageCode: string): string {
  return LANGUAGES.find((l) => l.code === languageCode)?.disclosure ?? "";
}

export type Voice = {
  name: string;
  description: string;
};

export const VOICES: readonly Voice[] = [
  { name: "Charon", description: "Masculina, clara e informativa" },
  { name: "Achird", description: "Masculina, amistosa" },
  { name: "Puck", description: "Masculina, animada" },
  { name: "Aoede", description: "Femenina, ligera y cercana" },
  { name: "Sulafat", description: "Femenina, cálida" },
  { name: "Despina", description: "Femenina, suave" },
];

export function voiceId(languageCode: string, voiceName: string): string {
  return `${languageCode}-Chirp3-HD-${voiceName}`;
}

/** Inverse of `voiceId`: "es-US-Chirp3-HD-Charon" → "Charon". */
export function voiceNameOf(id: string): string {
  return id.slice(id.lastIndexOf("-") + 1);
}

export const DEFAULT_VOICE_NAME = "Charon";
// A conversation's second voice by default (phase 21).
export const DEFAULT_SECOND_VOICE_NAME = "Aoede";

/** Voice 2's default for a given voice 1: never the same voice. */
export const secondVoiceFor = (first: string) =>
  first === DEFAULT_SECOND_VOICE_NAME
    ? DEFAULT_VOICE_NAME
    : DEFAULT_SECOND_VOICE_NAME;

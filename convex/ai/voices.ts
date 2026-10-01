// Chirp 3 HD voices chosen on 2026-09-30 (phase 5): Charon picked by ear by the
// owner; the rest from Google's voice descriptors, for variety. All exist in
// every locale below (checked against the voices API). The id is built from the
// language: "es-US" + "Charon" → "es-US-Chirp3-HD-Charon".
// Samples: public/voices/<lang>-<Voice>.mp3 (scripts/voice-samples.mjs).

// Locales with Chirp 3 HD voices (docs/screens.md §2.3). Labels are UI text.
export const LANGUAGES = [
  { code: "es-US", label: "Español (Latinoamérica)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "en-US", label: "Inglés (EE. UU.)" },
  { code: "pt-BR", label: "Portugués (Brasil)" },
] as const;

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

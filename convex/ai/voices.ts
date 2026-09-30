// ponytail: provisional catalog (phase 4); phase 5 confirms names against the
// official Chirp 3 HD list and keeps the best ones after listening to them.
// Chirp 3 HD offers the same voices in every supported locale, so the id is
// built from the language: "es-US" + "Aoede" → "es-US-Chirp3-HD-Aoede".

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
  { name: "Aoede", description: "Femenina, ligera y cercana" },
  { name: "Kore", description: "Femenina, firme y segura" },
  { name: "Leda", description: "Femenina, juvenil" },
  { name: "Charon", description: "Masculina, informativa" },
  { name: "Puck", description: "Masculina, animada" },
  { name: "Fenrir", description: "Masculina, enérgica" },
];

export function voiceId(languageCode: string, voiceName: string): string {
  return `${languageCode}-Chirp3-HD-${voiceName}`;
}

export const DEFAULT_VOICE_NAME = "Aoede";

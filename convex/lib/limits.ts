// Shared by Convex functions and the client form schema (lib/validations).
// AI limits: docs/ai-providers.md §6. Field lengths: docs/screens.md §2.3.

export const TITLE_MIN_CHARS = 3;
export const TITLE_MAX_CHARS = 100;
export const DESCRIPTION_MIN_CHARS = 10;
export const DESCRIPTION_MAX_CHARS = 600;

export const SCRIPT_MIN_CHARS = 50;
export const SCRIPT_MAX_CHARS = 5_000;

export const DAILY_AUDIO_GENERATIONS = 10;
// ~57 covers/day fit in the Cloudflare free tier for the whole app.
export const DAILY_IMAGE_GENERATIONS = 10;
export const DAILY_SCRIPT_GENERATIONS = 20;
// Below the 1M chars/month free tier of Chirp 3 HD.
export const GLOBAL_MONTHLY_TTS_CHARS = 900_000;

export const IMAGE_PROMPT_MIN_CHARS = 3;
export const IMAGE_PROMPT_MAX_CHARS = 1_000;
export const UPLOAD_MAX_MB = 5;

// Chirp 3 HD `pace` values offered in the UI (Lenta · Normal · Rápida).
export const SPEAKING_RATES = [0.9, 1, 1.15] as const;
export const DEFAULT_SPEAKING_RATE = 1;

// "Generar guion con IA" dialog.
export const SCRIPT_TOPIC_MIN_CHARS = 3;
export const SCRIPT_TOPIC_MAX_CHARS = 300;
export const SCRIPT_MINUTES = [1, 3, 5] as const;
// ~150 spoken words per minute at normal pace.
export const WORDS_PER_MINUTE = 150;
export const SCRIPT_TONES = [
  "cercano",
  "informativo",
  "entretenido",
  "formal",
] as const;

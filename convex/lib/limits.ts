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
export const COVER_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

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

/** A client-supplied list size as an integer in [1, max]; NaN → fallback. */
export const clampLimit = (
  limit: number | undefined,
  fallback: number,
  max: number,
) => Math.min(Math.max(Math.trunc(limit ?? fallback) || fallback, 1), max);

// Shows (ADR-029). The select in the create form lists up to this many.
export const MAX_SHOWS_PER_USER = 50;
// Apple Podcasts top-level categories, verified 2026-10-04 against
// podcasters.apple.com/support/1691; `value` goes verbatim into the RSS feed.
export const SHOW_CATEGORIES = [
  { value: "Arts", label: "Arte" },
  { value: "Business", label: "Negocios" },
  { value: "Comedy", label: "Comedia" },
  { value: "Education", label: "Educación" },
  { value: "Fiction", label: "Ficción" },
  { value: "Government", label: "Gobierno" },
  { value: "History", label: "Historia" },
  { value: "Health & Fitness", label: "Salud y bienestar" },
  { value: "Kids & Family", label: "Niños y familia" },
  { value: "Leisure", label: "Ocio" },
  { value: "Music", label: "Música" },
  { value: "News", label: "Noticias" },
  { value: "Religion & Spirituality", label: "Religión y espiritualidad" },
  { value: "Science", label: "Ciencia" },
  { value: "Society & Culture", label: "Sociedad y cultura" },
  { value: "Sports", label: "Deportes" },
  { value: "Technology", label: "Tecnología" },
  { value: "True Crime", label: "Crímenes reales" },
  { value: "TV & Film", label: "Cine y televisión" },
] as const;
export const DEFAULT_SHOW_CATEGORY = "Society & Culture";

// "Email para directorios" (phase 20): a sanity check, not RFC 5322; Spotify
// proves the address works by mailing it a code.
export const EMAIL_MAX_CHARS = 254;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Two-voice conversations (phase 21): "Name: text" per turn.
export const DIALOGUE_MAX_TURNS = 60;
export const HOST_NAME_MAX_CHARS = 20;

// Profile (phase 22). The display name also caps the name typed at sign-up.
export const DISPLAY_NAME_MAX_CHARS = 60;
export const BIO_MAX_CHARS = 160;
export const WEBSITE_MAX_CHARS = 200;

// Phase 23: one page of the followers dialog and of Ajustes → "Cuentas
// bloqueadas"; the server refuses bigger pages.
export const USER_PAGE_MAX = 20;

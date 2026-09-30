// Single home for AI endpoints, model ids and list prices (docs/ai-providers.md).
// Verify against the official docs before changing anything here.

// Cloud Text-to-Speech, Chirp 3 HD voices. API key auth verified 2026-09-30.
// https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
export const GOOGLE_TTS = {
  provider: "google",
  model: "chirp3-hd",
  endpoint: "https://texttospeech.googleapis.com/v1/text:synthesize",
  // API hard limit is 5,000 bytes of input per request.
  maxBytesPerRequest: 4_500,
  // Latency grows with input length (~35 s per 2,000 chars), so scripts are cut
  // in smaller parts synthesized in parallel: 5,000 chars ≈ 4 parts.
  chunkBytes: 1_500,
  sampleRate: 24_000,
  // List price after the 1M chars/month free tier (verified 2026-09-29).
  usdPerChar: 30 / 1_000_000,
} as const;

export const AUDIO_OUTPUT = {
  mp3Kbps: 64,
  // Silence inserted between synthesized parts.
  gapMs: 250,
} as const;

// Gemini API, script generation (free tier; key from a project WITHOUT billing).
// Verified 2026-09-30: stable, recommended, no shutdown date. gemini-3.8-flash
// answered 503 "high demand" on the free tier, Flash-Lite answered in ~2 s.
// https://ai.google.dev/gemini-api/docs/models · …/deprecations · …/pricing
export const GEMINI_TEXT = {
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
  endpoint:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
  // Paid-tier list prices (standard), per token.
  usdPerInputToken: 0.3 / 1_000_000,
  usdPerOutputToken: 2.5 / 1_000_000,
} as const;

// Cloudflare Workers AI, cover art (Free plan: 10,000 neurons/day, then calls
// fail instead of billing; never move the account to Workers Paid).
// Verified 2026-09-30: JPEG 1024×1024 in base64, ~2.5 s. Measured cost:
// 19.2 + 38.4 × steps neurons (4 steps = 172.8 ≈ 57 covers/day app-wide).
// https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/ · …/platform/pricing/
export const CLOUDFLARE_IMAGE = {
  provider: "cloudflare",
  model: "@cf/black-forest-labs/flux-1-schnell",
  endpoint: (accountId: string) =>
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
  steps: 4,
  // List price: USD 0.011 per 1,000 neurons beyond the free allocation.
  usdPerImage: (172.8 * 0.011) / 1_000,
} as const;

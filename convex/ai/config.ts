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

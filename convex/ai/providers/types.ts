/** Linear PCM 16-bit, mono, 24 kHz. Common output of every TTS provider. */
export type Pcm16 = { samples: Int16Array; sampleRate: 24000 };

export interface TtsProvider {
  id: "google";
  /** Conservative max UTF-8 bytes per request (API hard limit: 5000). */
  maxBytesPerRequest: number;
  synthesize(input: {
    text: string;
    voiceId: string; // e.g. "es-US-Chirp3-HD-<Voice>"
    languageCode: string; // BCP-47, must match the voice locale
    speakingRate?: number; // audioConfig.speakingRate, 0.25–2.0
  }): Promise<Pcm16>;
}

// ponytail: ImageProvider (phase 6) and TextProvider (script generation) are
// added here when their implementations land.

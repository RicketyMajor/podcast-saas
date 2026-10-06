import { describe, expect, it } from "vitest";

import { sameSource } from "../components/create/GeneratePodcast";

const source = {
  script: "Hola.",
  languageCode: "es-US",
  voiceName: "Charon",
  speakingRate: "1",
  spokenDisclosure: true,
} as const;

describe("sameSource", () => {
  it("marks the audio stale when the AI notice is switched", () => {
    expect(sameSource(source, { ...source })).toBe(true);
    expect(sameSource(source, { ...source, spokenDisclosure: false })).toBe(
      false,
    );
  });
});

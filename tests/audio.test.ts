import { describe, expect, it } from "vitest";

import { chunkScript, concatPcm, encodeMp3 } from "../convex/ai/audio";

const bytes = (text: string) => new TextEncoder().encode(text).length;
const words = (text: string) => text.split(/\s+/).join(" ");

describe("chunkScript", () => {
  const paragraph =
    "La canción del señor Núñez sonó en la radio. ¿Quién la escuchó? ¡Todos!";
  const script = Array.from(
    { length: 12 },
    (_, i) => `${i}. ${paragraph.repeat(6)}`,
  ).join("\n\n");

  it("keeps every part within the byte limit (UTF-8, not chars)", () => {
    const parts = chunkScript(script, 1500);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(bytes(part)).toBeLessThanOrEqual(1500);
  });

  it("keeps all words in order", () => {
    expect(words(chunkScript(script, 1500).join(" "))).toBe(words(script));
  });

  it("prefers paragraph boundaries", () => {
    const text = "Uno dos tres.\n\nCuatro cinco seis.";
    expect(chunkScript(text, 20)).toEqual([
      "Uno dos tres.",
      "Cuatro cinco seis.",
    ]);
  });

  it("falls back to sentences, then words", () => {
    // "Adiós mundo." is 13 bytes: "ó" takes 2.
    expect(chunkScript("Hola mundo. Adiós mundo.", 13)).toEqual([
      "Hola mundo.",
      "Adiós mundo.",
    ]);
    expect(chunkScript("palabra palabra palabra", 16)).toEqual([
      "palabra palabra",
      "palabra",
    ]);
  });

  it("cuts a single oversized word by code points", () => {
    const parts = chunkScript("ñ".repeat(3000), 4500);
    expect(parts.map(bytes)).toEqual([4500, 1500]);
  });

  it("returns a single trimmed part for short text and none for blank", () => {
    expect(chunkScript("  Hola.  ", 4500)).toEqual(["Hola."]);
    expect(chunkScript("   \n ", 4500)).toEqual([]);
  });
});

describe("concatPcm", () => {
  it("inserts silence only between parts", () => {
    const out = concatPcm([new Int16Array([1, 2]), new Int16Array([3])], 2);
    expect(Array.from(out)).toEqual([1, 2, 0, 0, 3]);
    expect(Array.from(concatPcm([new Int16Array([7])], 5))).toEqual([7]);
  });
});

describe("encodeMp3", () => {
  it("encodes one second of 24 kHz audio at ~64 kbps", () => {
    const mp3 = encodeMp3(new Int16Array(24_000), 24_000, 64);
    // 64 kbps ≈ 8,000 bytes/s, plus encoder padding.
    expect(mp3.length).toBeGreaterThan(7_000);
    expect(mp3.length).toBeLessThan(10_000);
  });
});

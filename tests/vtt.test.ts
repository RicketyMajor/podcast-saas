import { describe, expect, it } from "vitest";

import { estimateCues, toVtt } from "../lib/feed/vtt";

const LONG =
  "Según la leyenda, un pastor llamado Kaldi notó que sus cabras saltaban con una energía extraña después de comer unas bayas rojas que crecían junto al camino del monasterio";
const SCRIPT = `¿Sabías que el café nació en Etiopía? ¡Así es! ${LONG}.\n\nEn el siglo XV llegó a Yemen. Ok.`;
const cues = estimateCues([{ text: SCRIPT }], 42);

describe("estimateCues", () => {
  it("covers the whole audio with contiguous cues", () => {
    expect(cues[0]?.start).toBe(0);
    expect(cues.at(-1)?.end).toBe(42);
    cues.slice(1).forEach((cue, i) => expect(cue.start).toBe(cues[i]?.end));
  });
  it("keeps every word, in order", () => {
    const words = (text: string) => text.split(/\s+/).filter(Boolean);
    expect(words(cues.map((c) => c.text).join(" "))).toEqual(words(SCRIPT));
  });
  it("keeps cues readable: at most 120 characters", () => {
    expect(Math.max(...cues.map((c) => c.text.length))).toBeLessThanOrEqual(
      120,
    );
  });
  it("keeps ¿…? and ¡…! with their sentence", () => {
    expect(
      cues.some((c) =>
        c.text.includes("¿Sabías que el café nació en Etiopía?"),
      ),
    ).toBe(true);
    expect(cues.some((c) => c.text.includes("¡Así es!"))).toBe(true);
  });
  it("gives longer text more time", () => {
    const span = (c: { start: number; end: number }) => c.end - c.start;
    // "¡Así es!" is too short for a cue: it joins the next sentence.
    const long = cues.find((c) => c.text.includes("Según"));
    const short = cues.find((c) => c.text.startsWith("En el siglo"));
    expect(span(long!)).toBeGreaterThan(span(short!));
  });
});

describe("toVtt", () => {
  it("writes a WEBVTT file that says its times are estimated", () => {
    const vtt = toVtt([{ start: 0, end: 3725.5, text: "a <b> & c --> d" }]);
    expect(vtt.startsWith("WEBVTT\n\nNOTE Tiempos estimados")).toBe(true);
    expect(vtt).toContain(
      "1\n00:00:00.000 --> 01:02:05.500\na &lt;b&gt; &amp; c --&gt; d\n",
    );
  });
});

describe("estimateCues with speakers", () => {
  const talk = estimateCues(
    [
      { speaker: "Martín", text: "Hola, Lucía. ¿Cómo estás hoy?" },
      { speaker: "Lucía", text: "Sí." },
      { speaker: "Martín", text: "Qué bueno, empecemos con el café." },
    ],
    10,
  );
  it("tags every cue with its speaker and never merges across turns", () => {
    expect(talk.map((c) => c.speaker)).toEqual(["Martín", "Lucía", "Martín"]);
    expect(talk[1]?.text).toBe("Sí.");
  });
  it("still covers the whole audio", () => {
    expect(talk[0]?.start).toBe(0);
    expect(talk.at(-1)?.end).toBe(10);
  });
  it("writes WebVTT voice spans", () => {
    expect(toVtt(talk)).toContain("\n<v Lucía>Sí.\n");
  });
});

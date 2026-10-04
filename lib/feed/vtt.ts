export type Cue = { start: number; end: number; text: string };

const MAX_CUE_CHARS = 120;
const MIN_CUE_CHARS = 15;
// ponytail: estimated, not measured. A sentence end costs about this many
// characters of speaking time (~0.5 s at ~15 chars/s); calibrate by ear.
// The TTS's 250 ms gaps between synthesized parts aren't modeled (< 1 s).
export const PAUSE_CHARS = 8;

const NOTE =
  "NOTE Tiempos estimados a partir de la duración del audio; no son marcas del TTS.";

// After . ! ? … (and a closing quote or bracket) followed by space; at line breaks.
const sentences = (text: string) =>
  text
    .split(/\n+|(?<=[.!?…]["'»”)\]]?)\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

// Short fragments ("Ok.") join the next sentence, or the last one at the end.
function mergeShort(list: string[]): string[] {
  const out: string[] = [];
  let carry = "";
  for (const s of list) {
    const joined = carry ? `${carry} ${s}` : s;
    if (joined.length < MIN_CUE_CHARS) carry = joined;
    else {
      out.push(joined);
      carry = "";
    }
  }
  if (carry) out.push(out.length ? `${out.pop()} ${carry}` : carry);
  return out;
}

// Long sentences break at the last comma in the second half, else the last space.
function fit(sentence: string): string[] {
  const parts: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_CUE_CHARS) {
    const head = rest.slice(0, MAX_CUE_CHARS + 1);
    const comma = head.lastIndexOf(", ");
    const space = head.lastIndexOf(" ");
    // No space at all (one 120-char word): hard cut.
    const at =
      comma >= MAX_CUE_CHARS / 2
        ? comma + 1
        : space > 0
          ? space
          : MAX_CUE_CHARS;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  return [...parts, rest];
}

/** Spreads the real duration over the text, weighted by length. */
export function estimateCues(transcript: string, durationSec: number): Cue[] {
  const pieces = mergeShort(sentences(transcript)).flatMap((sentence) => {
    const parts = fit(sentence);
    return parts.map((text, i) => ({
      text,
      weight: text.length + (i === parts.length - 1 ? PAUSE_CHARS : 0),
    }));
  });
  const total = pieces.reduce((sum, p) => sum + p.weight, 0);
  let done = 0;
  return pieces.map(({ text, weight }) => {
    const start = (done / total) * durationSec;
    done += weight;
    return { start, end: (done / total) * durationSec, text };
  });
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const stamp = (sec: number) => {
  const ms = Math.round(sec * 1000);
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
};
// Escaping ">" also rules out a literal "-->" in cue text.
const cueText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toVtt(cues: Cue[]): string {
  const blocks = cues.map(
    (c, i) =>
      `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${cueText(c.text)}`,
  );
  return `${["WEBVTT", NOTE, ...blocks].join("\n\n")}\n`;
}

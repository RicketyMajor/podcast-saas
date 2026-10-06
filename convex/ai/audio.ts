import { Mp3Encoder } from "@breezystack/lamejs";

const utf8 = new TextEncoder();
const byteLength = (text: string) => utf8.encode(text).length;

// Coarse to fine: paragraphs, then sentences, then words.
const LEVELS = [
  { split: (t: string) => t.split(/\n\s*\n|\n/), joiner: "\n\n" },
  { split: (t: string) => t.split(/(?<=[.!?…:;])\s+/), joiner: " " },
  { split: (t: string) => t.split(/\s+/), joiner: " " },
];

/** Greedily joins consecutive pieces while they fit in maxBytes. */
function pack(pieces: string[], joiner: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const candidate = current ? current + joiner + piece : piece;
    if (byteLength(candidate) <= maxBytes) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function fit(text: string, maxBytes: number, level: number): string[] {
  if (byteLength(text) <= maxBytes) return [text];
  const rule = LEVELS[level];
  if (!rule) {
    // A single "word" larger than the limit: cut by code points.
    return pack(Array.from(text), "", maxBytes);
  }
  const pieces = rule
    .split(text)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => fit(p, maxBytes, level + 1));
  return pack(pieces, rule.joiner, maxBytes);
}

/**
 * Splits a script into parts of at most maxBytes UTF-8 bytes, preferring
 * paragraph, then sentence, then word boundaries. Order is preserved.
 */
export function chunkScript(text: string, maxBytes: number): string[] {
  const trimmed = text.trim();
  return trimmed ? fit(trimmed, maxBytes, 0) : [];
}

export function concatPcm(parts: Int16Array[], gapSamples: number): Int16Array {
  const total =
    parts.reduce((sum, p) => sum + p.length, 0) +
    gapSamples * Math.max(0, parts.length - 1);
  const out = new Int16Array(total); // zero-filled = silence
  let offset = 0;
  parts.forEach((part, i) => {
    if (i > 0) offset += gapSamples;
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

export function encodeMp3(
  samples: Int16Array,
  sampleRate: number,
  kbps: number,
): Uint8Array<ArrayBuffer> {
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const frames: Uint8Array[] = [];
  const BLOCK = 1152 * 32; // multiple of the MP3 frame size
  for (let i = 0; i < samples.length; i += BLOCK) {
    frames.push(encoder.encodeBuffer(samples.subarray(i, i + BLOCK)));
  }
  frames.push(encoder.flush());

  const out = new Uint8Array(frames.reduce((sum, f) => sum + f.length, 0));
  let offset = 0;
  for (const f of frames) {
    out.set(f, offset);
    offset += f.length;
  }
  return out;
}

/**
 * Promise.all with at most `limit` calls in flight; results keep the input
 * order. After a failure no new call starts and the first error is thrown.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i] as T);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

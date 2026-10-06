import sharp from "sharp";

import { cachedImage, unavailable } from "./http";

// Apple Podcasts show cover via RSS: square, 1400–3000 px, JPEG or PNG, no
// transparency (podcasters.apple.com/support/5514).
const MIN_PX = 1400;
const MAX_PX = 3000;

/**
 * Any stored cover as a directory-ready JPEG: square crop of its short side,
 * clamped to 1400–3000 px, alpha flattened on black.
 * ponytail: upscaling a 1024 px AI cover meets the rule, it adds no detail.
 */
export async function toDirectoryCover(
  input: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const image = sharp(input).rotate(); // honor EXIF orientation of photos
  const { width = 0, height = 0 } = await image.metadata();
  const side = Math.min(Math.max(Math.min(width, height), MIN_PX), MAX_PX);
  const jpeg = await image
    .resize(side, side, { fit: "cover" })
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .jpeg({ quality: 90 })
    .toBuffer();
  return new Uint8Array(jpeg);
}

/** Downloads a stored cover and answers with its directory version. */
export async function directoryCoverResponse(imageUrl: string) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`cover download ${res.status}`);
    return cachedImage(
      await toDirectoryCover(new Uint8Array(await res.arrayBuffer())),
    );
  } catch (error) {
    console.error(
      `directory cover failed: ${error instanceof Error ? error.message : error}`,
    );
    return unavailable();
  }
}

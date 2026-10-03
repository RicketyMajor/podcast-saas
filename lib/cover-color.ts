// Ambient color: the dominant hue of a cover, clamped so it stays legible
// as an accent on the graphite background (AA for UI parts at L ≥ 0.7).

const AMBIENT_L = 0.76;
const MIN_C = 0.03;
const MAX_C = 0.15;

const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** sRGB (0–255) → OKLab. */
export function rgbToOklab(r: number, g: number, b: number) {
  const lr = linear(r / 255);
  const lg = linear(g / 255);
  const lb = linear(b / 255);
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * RGBA pixels → `oklch(...)`. Averages in OKLab weighted by chroma, so the
 * most colorful areas set the hue and gray backgrounds barely count.
 */
export function ambientFromPixels(data: Uint8ClampedArray) {
  let sa = 0;
  let sb = 0;
  let sc = 0;
  let w = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const { a, b } = rgbToOklab(data[i]!, data[i + 1]!, data[i + 2]!);
    const c = Math.hypot(a, b);
    const weight = c * c + 1e-4;
    sa += a * weight;
    sb += b * weight;
    sc += c * weight;
    w += weight;
  }
  if (w === 0) return null;
  const hue = ((Math.atan2(sb, sa) * 180) / Math.PI + 360) % 360;
  const chroma = Math.min(Math.max((sc / w) * 1.2, MIN_C), MAX_C);
  return `oklch(${AMBIENT_L} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
}

const cache = new Map<string, Promise<string | null>>();

/** Samples a cover at 24×24. Needs CORS on the image (Convex storage sends it). */
export function getCoverColor(url: string) {
  let pending = cache.get(url);
  if (!pending) {
    pending = new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 24;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, 24, 24);
          resolve(ambientFromPixels(ctx.getImageData(0, 0, 24, 24).data));
        } catch {
          resolve(null); // tainted canvas: keep the default ambient
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    cache.set(url, pending);
  }
  return pending;
}

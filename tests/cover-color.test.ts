import { describe, expect, it } from "vitest";

import { ambientFromPixels, rgbToOklab } from "@/lib/cover-color";

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());
const parse = (s: string | null) => s!.match(/[\d.]+/g)!.map(Number);

describe("cover color", () => {
  it("converts sRGB white to OKLab L≈1 with no chroma", () => {
    const { L, a, b } = rgbToOklab(255, 255, 255);
    expect(L).toBeCloseTo(1, 3);
    expect(Math.hypot(a, b)).toBeLessThan(1e-3);
  });

  it("lets the colorful area set the hue over a gray background", () => {
    const gray = [128, 128, 128, 255];
    const red = [220, 30, 40, 255];
    const [L, C, H = NaN] = parse(
      ambientFromPixels(pixels(gray, gray, gray, red)),
    );
    expect(L).toBe(0.76);
    expect(C).toBeLessThanOrEqual(0.15);
    expect(H < 40 || H > 340).toBe(true); // red-ish
  });

  it("clamps grayscale covers to a near-neutral accent", () => {
    const [, C] = parse(ambientFromPixels(pixels([40, 40, 40, 255])));
    expect(C).toBe(0.03);
  });

  it("ignores transparent pixels", () => {
    expect(ambientFromPixels(pixels([255, 0, 0, 0]))).toBeNull();
  });
});

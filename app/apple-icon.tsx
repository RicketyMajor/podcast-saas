import { ImageResponse } from "next/og";

import { WAVE_BARS } from "@/lib/constants";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Hex, not tokens: this is an image. Same values as --background and the
// default --ambient in app/globals.css (oklch converted to sRGB).
const BACKGROUND = "#07080a";
const AMBIENT = "#50b9df";
// The 25×24 mark drawn 4× (≈ 92×88 px), centered; iOS rounds the corners.
const SCALE = 4;

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 2 * SCALE }}>
        {WAVE_BARS.map((bar) => (
          <div
            key={bar.x}
            style={{
              width: 3 * SCALE,
              height: bar.h * SCALE,
              borderRadius: 1.5 * SCALE,
              background: AMBIENT,
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}

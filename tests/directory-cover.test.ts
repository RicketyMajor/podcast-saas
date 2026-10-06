import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { toDirectoryCover } from "../lib/feed/cover";

// A half-transparent PNG, like an upload with an alpha channel.
const png = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 200, g: 60, b: 40, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();

const shape = async (input: Buffer) =>
  await sharp(await toDirectoryCover(input)).metadata();

describe("toDirectoryCover", () => {
  it("turns a 1024 px AI cover with alpha into an opaque 1400 px JPEG", async () => {
    expect(await shape(await png(1024, 1024))).toMatchObject({
      format: "jpeg",
      width: 1400,
      height: 1400,
      hasAlpha: false,
    });
  });

  it("crops a landscape upload to a square of its short side", async () => {
    expect(await shape(await png(2000, 1600))).toMatchObject({
      width: 1600,
      height: 1600,
    });
  });

  it("caps big uploads at 3000 px and scales tiny ones up", async () => {
    expect(await shape(await png(4000, 3200))).toMatchObject({ width: 3000 });
    expect(await shape(await png(43, 43))).toMatchObject({ width: 1400 });
  });
});

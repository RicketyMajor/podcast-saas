import { describe, expect, it } from "vitest";

import { coverFileError } from "../lib/validations/podcast";

const MB = 1024 * 1024;

describe("coverFileError", () => {
  it("accepts PNG, JPG and WebP up to 5 MB", () => {
    expect(coverFileError({ type: "image/png", size: 5 * MB })).toBeNull();
    expect(coverFileError({ type: "image/jpeg", size: 1 })).toBeNull();
    expect(coverFileError({ type: "image/webp", size: MB })).toBeNull();
  });

  it("rejects a 6 MB image and a PDF", () => {
    expect(coverFileError({ type: "image/png", size: 6 * MB })).toMatch(/5 MB/);
    expect(coverFileError({ type: "application/pdf", size: MB })).toMatch(
      /Formato/,
    );
  });
});

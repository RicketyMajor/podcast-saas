import { describe, expect, it } from "vitest";

import { normalizeSearchText } from "../convex/lib/text";
import { formatCount, formatDuration, safeRedirectPath } from "../lib/utils";

describe("normalizeSearchText", () => {
  it("drops accents and case so 'cancion' matches 'Canción'", () => {
    expect(normalizeSearchText("Canción  de   Ñandú")).toBe("cancion de nandu");
  });
});

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/create-podcast?title=Jazz")).toBe(
      "/create-podcast?title=Jazz",
    );
  });

  it("falls back to / for anything else", () => {
    for (const bad of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "",
      undefined,
      ["/a"],
    ]) {
      expect(safeRedirectPath(bad)).toBe("/");
    }
  });
});

describe("formatCount / formatDuration", () => {
  it("groups thousands the Spanish way, including 4 digits", () => {
    expect(formatCount(5000)).toBe("5.000");
    expect(formatCount(50)).toBe("50");
  });

  it("formats seconds as m:ss", () => {
    expect(formatDuration(7.06)).toBe("0:07");
    expect(formatDuration(265.1)).toBe("4:25");
  });
});

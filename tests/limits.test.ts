import { describe, expect, it } from "vitest";

import { clampLimit } from "../convex/lib/limits";

describe("clampLimit", () => {
  it("keeps client list sizes inside [1, max]", () => {
    expect(clampLimit(undefined, 8, 50)).toBe(8);
    expect(clampLimit(Number.NaN, 8, 50)).toBe(8);
    expect(clampLimit(0, 8, 50)).toBe(8);
    expect(clampLimit(-3, 8, 50)).toBe(1);
    expect(clampLimit(2.7, 8, 50)).toBe(2);
    expect(clampLimit(Infinity, 8, 50)).toBe(50);
  });
});

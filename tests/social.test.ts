import { describe, expect, it } from "vitest";

import { takeWhere } from "../convex/lib/social";

/** Yields the items and records which ones were read. */
async function* stream<T>(items: T[], read: T[]) {
  for (const item of items) {
    read.push(item);
    yield item;
  }
}

describe("takeWhere", () => {
  it("returns the first n that pass and reads no further", async () => {
    const read: number[] = [];
    const even = await takeWhere(
      stream([1, 2, 3, 4, 5, 6], read),
      2,
      (n) => n % 2 === 0,
    );
    expect(even).toEqual([2, 4]);
    expect(read).toEqual([1, 2, 3, 4]);
  });

  it("reads exactly n when nothing is skipped, like take(n)", async () => {
    const read: number[] = [];
    expect(await takeWhere(stream([1, 2, 3], read), 2, () => true)).toEqual([
      1, 2,
    ]);
    expect(read).toEqual([1, 2]);
  });

  it("returns fewer when the stream runs out", async () => {
    expect(
      await takeWhere(stream([1, 3, 5], []), 2, (n) => n % 2 === 0),
    ).toEqual([]);
  });

  it("stops after maxScan reads, even if short of n", async () => {
    const read: number[] = [];
    const big = await takeWhere(
      stream([1, 2, 3, 4, 5, 6, 7, 8], read),
      2,
      (n) => n > 6,
      5,
    );
    expect(big).toEqual([]);
    expect(read).toEqual([1, 2, 3, 4, 5]);
  });
});

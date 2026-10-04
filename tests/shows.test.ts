import { describe, expect, it } from "vitest";

import { SHOW_CATEGORIES } from "../convex/lib/limits";
import { searchTextOf } from "../convex/lib/text";
import { showFormSchema } from "../lib/validations/show";

describe("searchTextOf", () => {
  it("joins episode, author and show so any of them finds the episode", () => {
    expect(
      searchTextOf("Café de altura", "QA Waves", "Cuadernos de viaje"),
    ).toBe("cafe de altura qa waves cuadernos de viaje");
  });

  it("skips a missing show title (episodes before the backfill)", () => {
    expect(searchTextOf("Café", "Ana", undefined)).toBe("cafe ana");
  });
});

describe("showFormSchema", () => {
  const valid = {
    title: "Ciencia de bolsillo",
    description: "Ideas científicas en pocos minutos.",
    languageCode: "es-US",
    category: "Science",
    explicit: false,
  };

  it("accepts a complete show", () => {
    expect(showFormSchema.safeParse(valid).success).toBe(true);
  });

  it("only takes Apple's category text, not the Spanish label", () => {
    expect(
      showFormSchema.safeParse({ ...valid, category: "Ciencia" }).success,
    ).toBe(false);
  });
});

describe("SHOW_CATEGORIES", () => {
  it("lists Apple's 19 top-level categories once each", () => {
    const values = SHOW_CATEGORIES.map((c) => c.value);
    expect(new Set(values).size).toBe(19);
    expect(values).toContain("Society & Culture");
  });
});

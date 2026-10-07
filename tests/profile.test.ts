import { describe, expect, it } from "vitest";

import {
  BIO_MAX_CHARS,
  DISPLAY_NAME_MAX_CHARS,
  WEBSITE_MAX_CHARS,
} from "../convex/lib/limits";
import {
  cleanProfile,
  profileError,
  websiteError,
} from "../convex/lib/profile";
import { profileFormSchema } from "../lib/validations/profile";

const valid = {
  displayName: "Ana Ruiz",
  bio: "Cuento historias.",
  website: "https://ana.example",
};

describe("profileError", () => {
  it("accepts a full profile and an empty one (empty clears a field)", () => {
    expect(profileError(valid)).toBeNull();
    expect(profileError({ displayName: " ", bio: "", website: "" })).toBeNull();
  });

  it("caps the name", () => {
    const name = "a".repeat(DISPLAY_NAME_MAX_CHARS);
    expect(profileError({ ...valid, displayName: name })).toBeNull();
    expect(profileError({ ...valid, displayName: `${name}a` })).toMatch(
      /nombre/,
    );
  });

  it("counts the bio once it's on one line", () => {
    const bio = "a".repeat(BIO_MAX_CHARS);
    expect(profileError({ ...valid, bio })).toBeNull();
    expect(profileError({ ...valid, bio: `${bio}a` })).toMatch(/bio/);
    // 80 + 80 with a paragraph break: 161 once collapsed to one space.
    expect(
      profileError({ ...valid, bio: `${"a".repeat(80)}\n\n${"b".repeat(80)}` }),
    ).toMatch(/bio/);
  });
});

describe("websiteError", () => {
  it.each([
    ["http://ana.example", /https:\/\//],
    ["ana.example", /https:\/\//],
    ["javascript:alert(1)", /https:\/\//],
    ["https://", /válido/],
    [`https://${"a".repeat(WEBSITE_MAX_CHARS)}.com`, /200/],
  ])("rejects %s", (value, message) => {
    expect(websiteError(value)).toMatch(message);
  });

  it("takes https in any case, around spaces", () => {
    expect(websiteError("  HTTPS://Ana.example/podcast ")).toBeNull();
  });
});

describe("cleanProfile", () => {
  it("trims and puts the bio on one line", () => {
    expect(
      cleanProfile({
        displayName: "  Ana ",
        bio: " Hola\n\nmundo  ",
        website: " https://a.example ",
      }),
    ).toEqual({
      displayName: "Ana",
      bio: "Hola mundo",
      website: "https://a.example",
    });
  });
});

describe("profileFormSchema", () => {
  it("accepts a valid profile", () => {
    expect(profileFormSchema.safeParse(valid).success).toBe(true);
  });

  it("reports the error on its own field", () => {
    const result = profileFormSchema.safeParse({
      ...valid,
      website: "http://a.example",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["website"]);
    expect(result.error?.issues[0]?.message).toBe(
      "El enlace debe empezar con https://.",
    );
  });
});

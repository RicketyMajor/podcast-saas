import { describe, expect, it } from "vitest";

import { disclosureOf, LANGUAGES } from "../convex/ai/voices";

describe("disclosureOf", () => {
  it("has a short spoken AI notice for every language", () => {
    for (const { code } of LANGUAGES) {
      const phrase = disclosureOf(code);
      expect(phrase.length).toBeGreaterThan(20);
      expect(phrase.length).toBeLessThan(120);
      expect(phrase.endsWith(".")).toBe(true);
    }
  });

  it("speaks the episode's language", () => {
    expect(disclosureOf("es-US")).toBe(
      "Este episodio fue creado con voces generadas por inteligencia artificial.",
    );
    expect(disclosureOf("es-ES")).toBe(disclosureOf("es-US"));
    expect(disclosureOf("en-US")).toBe(
      "This episode was created with AI-generated voices.",
    );
    expect(disclosureOf("pt-BR")).toBe(
      "Este episódio foi criado com vozes geradas por inteligência artificial.",
    );
  });

  it("is empty for a language Waves doesn't offer", () => {
    expect(disclosureOf("fr-FR")).toBe("");
  });
});

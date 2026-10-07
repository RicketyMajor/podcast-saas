import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import { normalizeSearchText, tidyScript } from "../convex/lib/text";
import {
  errorMessage,
  formatCount,
  formatDuration,
  safeRedirectPath,
} from "../lib/utils";

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

describe("tidyScript", () => {
  it("drops markdown and extra blank lines", () => {
    expect(
      tidyScript("# Título\n\n**Hola**, *mundo*.\n\n\n\n- Adiós.", 100),
    ).toBe("Título\n\nHola, mundo.\n\nAdiós.");
  });

  it("cuts at a paragraph, else a sentence, within the limit", () => {
    const para = "Uno dos tres cuatro.";
    expect(tidyScript(`${para}\n\n${para}\n\n${para}`, 50)).toBe(
      `${para}\n\n${para}`,
    );
    expect(tidyScript("Hola mundo. Adiós mundo cruel.", 20)).toBe(
      "Hola mundo.",
    );
  });
});

describe("errorMessage", () => {
  it("shows the message a Convex function threw on purpose", () => {
    const err = new ConvexError({
      code: "VALIDATION",
      message: "Escribe un título.",
    });
    expect(errorMessage(err)).toBe("Escribe un título.");
  });

  it("hides anything else behind the generic message", () => {
    expect(errorMessage(new Error("boom"))).toBe(
      "Algo salió mal. Inténtalo de nuevo.",
    );
    expect(errorMessage(new ConvexError({ code: "X" }))).toBe(
      "Algo salió mal. Inténtalo de nuevo.",
    );
  });
});

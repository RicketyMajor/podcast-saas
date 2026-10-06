import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";

import {
  dialogueScript,
  hostNameError,
  hostNamesError,
  parseDialogue,
  renameSpeaker,
  sameName,
} from "../convex/lib/dialogue";
import { checkDialogue } from "../convex/lib/validation";

const NAMES = ["Martín", "Lucía"] as const;

describe("parseDialogue", () => {
  it("opens a turn per name line and keeps continuation lines", () => {
    const script =
      "\nMartín: Hola, Lucía.\nLucía: Hola, Martín.\nSigue Lucía.\n\nMartín: Adiós.";
    expect(parseDialogue(script, NAMES)).toEqual({
      ok: true,
      turns: [
        { speaker: 0, text: "Hola, Lucía." },
        { speaker: 1, text: "Hola, Martín.\nSigue Lucía." },
        { speaker: 0, text: "Adiós." },
      ],
    });
  });

  it("matches names in any case, with spaces around the colon", () => {
    expect(parseDialogue("  martín :Hola.\nLUCÍA:   Chao.", NAMES)).toEqual({
      ok: true,
      turns: [
        { speaker: 0, text: "Hola." },
        { speaker: 1, text: "Chao." },
      ],
    });
  });

  it("treats another 'Word:' line as text, not a speaker", () => {
    const result = parseDialogue(
      "Martín: Ojo.\nNota: esto sigue.\nLucía: Sí.",
      NAMES,
    );
    expect(result.ok && result.turns[0]?.text).toBe("Ojo.\nNota: esto sigue.");
  });

  it("doesn't take a longer name for a shorter one", () => {
    const result = parseDialogue("Ana: Hola.\nAna Luz: Hola.", [
      "Ana",
      "Ana Luz",
    ]);
    expect(result.ok && result.turns.map((t) => t.speaker)).toEqual([0, 1]);
  });

  it("drops a label with nothing said", () => {
    const result = parseDialogue(
      "Martín:\nLucía: Hola.\nMartín: Chao.",
      NAMES,
    );
    expect(result.ok && result.turns.length).toBe(2);
  });

  it("rejects a script that doesn't start with a name", () => {
    expect(parseDialogue("Hola a todos.\nMartín: Hola.", NAMES)).toEqual({
      ok: false,
      error: "El guion debe empezar con el nombre de una voz.",
    });
    expect(parseDialogue("   \n", NAMES)).toEqual({
      ok: false,
      error: "El guion debe empezar con el nombre de una voz.",
    });
  });

  it("rejects a script that uses only one voice", () => {
    expect(parseDialogue("Martín: Hola.\nMartín: Chao.", NAMES)).toEqual({
      ok: false,
      error: "Usa las dos voces o cambia a Narración.",
    });
  });

  it("rejects more than 60 turns", () => {
    const turns = Array.from({ length: 61 }, (_, i) =>
      i % 2 ? "Lucía: Sí." : "Martín: No.",
    ).join("\n");
    expect(parseDialogue(turns, NAMES)).toEqual({
      ok: false,
      error: "Máximo 60 intervenciones.",
    });
    expect(
      parseDialogue(turns.split("\n").slice(0, 60).join("\n"), NAMES).ok,
    ).toBe(true);
  });

  it("reads Windows line breaks", () => {
    expect(parseDialogue("Martín: Hola.\r\nLucía: Chao.", NAMES).ok).toBe(true);
  });
});

describe("host names", () => {
  it("accepts 1–20 letters, spaces, ' and - starting with a letter", () => {
    for (const name of [
      "Ana",
      "José María",
      "O'Neil",
      "Jean-Luc",
      "Ñ",
      "Zoë",
    ]) {
      expect(hostNameError(name)).toBeNull();
    }
  });
  it("rejects empty, too long, digits, symbols or a leading non-letter", () => {
    expect(hostNameError("  ")).toBe("Escribe un nombre.");
    for (const name of ["A".repeat(21), "R2D2", "Ana:", "-Ana", "Ana!"]) {
      expect(hostNameError(name)).toBe(
        "Usa hasta 20 letras, espacios, ' o -, empezando por una letra.",
      );
    }
  });
  it("needs exactly two different names", () => {
    expect(hostNamesError(["Ana", "Luis"])).toBeNull();
    expect(hostNamesError(["Ana", " ana "])).toBe(
      "Usa dos nombres distintos.",
    );
    expect(hostNamesError(["Ana"])).toBe(
      "Una conversación lleva exactamente dos voces.",
    );
    expect(hostNamesError(["Ana", "R2"])).toBe(
      "Usa hasta 20 letras, espacios, ' o -, empezando por una letra.",
    );
  });
  it("compares names without case or outer spaces", () => {
    expect(sameName(" Lucía", "lucía ")).toBe(true);
    expect(sameName("Ana", "Ana Luz")).toBe(false);
  });
});

describe("renameSpeaker", () => {
  it("rewrites only the labels at line starts", () => {
    expect(
      renameSpeaker(
        "Charon: Hola, Charon.\n  charon :Chao.\nAoede: Sí.",
        "Charon",
        "Martín",
      ),
    ).toBe("Martín: Hola, Charon.\nMartín: Chao.\nAoede: Sí.");
  });
});

describe("dialogueScript", () => {
  it("turns Gemini's A/B turns into 'Name: text' paragraphs", () => {
    expect(
      dialogueScript(
        [
          { speaker: "A", text: " Hola,\n Lucía. " },
          { speaker: "B", text: "" },
          { speaker: "B", text: "Hola, Martín." },
        ],
        NAMES,
      ),
    ).toBe("Martín: Hola, Lucía.\n\nLucía: Hola, Martín.");
  });
});

describe("checkDialogue", () => {
  const SCRIPT = "Martín: Hola, Lucía.\nLucía: Hola, Martín.";
  const martin = { name: " Martín ", voiceName: "Charon" };
  const hosts = [martin, { name: "Lucía", voiceName: "Aoede" }];
  const message = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      if (error instanceof ConvexError) return error.data.message;
    }
    return null;
  };

  it("is null for narration", () => {
    expect(checkDialogue(SCRIPT, "Charon", undefined)).toBeNull();
  });
  it("returns trimmed hosts and the turns", () => {
    expect(checkDialogue(SCRIPT, "Charon", hosts)).toEqual({
      hosts: [
        { name: "Martín", voiceName: "Charon" },
        { name: "Lucía", voiceName: "Aoede" },
      ],
      turns: [
        { speaker: 0, text: "Hola, Lucía." },
        { speaker: 1, text: "Hola, Martín." },
      ],
    });
  });
  it("rejects incoherent hosts and scripts", () => {
    expect(message(() => checkDialogue(SCRIPT, "Charon", [martin]))).toBe(
      "Una conversación lleva exactamente dos voces.",
    );
    expect(
      message(() =>
        checkDialogue(SCRIPT, "Charon", [
          martin,
          { name: "Lucía", voiceName: "Charon" },
        ]),
      ),
    ).toBe("Elige dos voces distintas.");
    expect(
      message(() =>
        checkDialogue(SCRIPT, "Charon", [
          martin,
          { name: "Lucía", voiceName: "Nope" },
        ]),
      ),
    ).toBe("Voz no disponible.");
    expect(message(() => checkDialogue(SCRIPT, "Puck", hosts))).toBe(
      "La voz 1 no coincide con la voz del episodio.",
    );
    expect(
      message(() => checkDialogue("Hola a todos.", "Charon", hosts)),
    ).toBe("El guion debe empezar con el nombre de una voz.");
  });
});

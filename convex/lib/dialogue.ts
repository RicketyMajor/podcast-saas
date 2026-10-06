// Two-voice scripts (phase 21): each turn starts with "Name:". Pure, so the
// form (Zod), Convex and the transcripts share the exact same rules.
import { DIALOGUE_MAX_TURNS, HOST_NAME_MAX_CHARS } from "./limits";

export type Speaker = 0 | 1;
export type Turn = { speaker: Speaker; text: string };
export type Dialogue =
  { ok: true; turns: Turn[] } | { ok: false; error: string };

const START_ERROR = "El guion debe empezar con el nombre de una voz.";
// A letter first, then letters (accents included), spaces, ' or -.
const NAME = new RegExp(
  `^\\p{L}[\\p{L}\\p{M} '’-]{0,${HOST_NAME_MAX_CHARS - 1}}$`,
  "u",
);

/** Why a host name can't be used, or null. */
export function hostNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Escribe un nombre.";
  if (!NAME.test(trimmed)) {
    return `Usa hasta ${HOST_NAME_MAX_CHARS} letras, espacios, ' o -, empezando por una letra.`;
  }
  return null;
}

export const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Why a pair of host names can't be used, or null. */
export function hostNamesError(names: readonly string[]): string | null {
  const [a, b] = names;
  if (names.length !== 2 || a === undefined || b === undefined) {
    return "Una conversación lleva exactamente dos voces.";
  }
  return (
    hostNameError(a) ??
    hostNameError(b) ??
    (sameName(a, b) ? "Usa dos nombres distintos." : null)
  );
}

// Valid names hold no regex syntax, but parseDialogue also reads stored text.
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "Name:" at a line start, in any case, with spaces around the colon.
const label = (name: string, flags = "") =>
  new RegExp(`^[ \\t]*${escape(name.trim())}[ \\t]*:[ \\t]*`, `iu${flags}`);

/**
 * Splits a script into turns: a line that starts with a host's name opens a
 * turn, any other line continues the current one (its line break kept).
 * Names aren't part of the text: they're never voiced.
 */
export function parseDialogue(
  script: string,
  names: readonly [string, string],
): Dialogue {
  const labels = names.map((name) => label(name));
  const turns: Turn[] = [];
  for (const line of script.replace(/\r\n?/g, "\n").split("\n")) {
    const speaker = labels.findIndex((re) => re.test(line));
    const last = turns.at(-1);
    if (speaker === 0 || speaker === 1) {
      turns.push({
        speaker,
        text: line.replace(labels[speaker] as RegExp, ""),
      });
    } else if (last) {
      last.text += `\n${line}`;
    } else if (line.trim() !== "") {
      return { ok: false, error: START_ERROR };
    }
  }
  const spoken = turns
    .map((turn) => ({ ...turn, text: turn.text.trim() }))
    .filter((turn) => turn.text !== "");
  if (spoken.length === 0) return { ok: false, error: START_ERROR };
  if (spoken.length > DIALOGUE_MAX_TURNS) {
    return { ok: false, error: `Máximo ${DIALOGUE_MAX_TURNS} intervenciones.` };
  }
  if (
    !spoken.some((t) => t.speaker === 0) ||
    !spoken.some((t) => t.speaker === 1)
  ) {
    return { ok: false, error: "Usa las dos voces o cambia a Narración." };
  }
  return { ok: true, turns: spoken };
}

/** Rewrites the "From:" labels at line starts as "To:" (a host was renamed). */
export function renameSpeaker(script: string, from: string, to: string) {
  return script.replace(label(from, "gm"), () => `${to.trim()}: `);
}

/** Gemini's A/B turns as a script: "Name: text", one turn per paragraph. */
export function dialogueScript(
  turns: readonly { speaker: "A" | "B"; text: string }[],
  names: readonly [string, string],
) {
  return turns
    .map((turn) => ({
      name: names[turn.speaker === "A" ? 0 : 1].trim(),
      text: turn.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((turn) => turn.text !== "")
    .map((turn) => `${turn.name}: ${turn.text}`)
    .join("\n\n");
}

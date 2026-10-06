import { ConvexError, v } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import { VOICES, voiceNameOf } from "../ai/voices";
import { hostNamesError, parseDialogue, type Turn } from "./dialogue";
import { EMAIL_MAX_CHARS, EMAIL_PATTERN } from "./limits";

export function invalid(message: string) {
  return new ConvexError({ code: "VALIDATION", message });
}

/** Trimmed text within [min, max] characters, or a VALIDATION error. */
export function text(value: string, label: string, min: number, max: number) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw invalid(`${label} debe tener entre ${min} y ${max} caracteres.`);
  }
  return trimmed;
}

/** A trimmed email, undefined when blank, or a VALIDATION error. */
export function optionalEmail(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return undefined;
  if (trimmed.length > EMAIL_MAX_CHARS || !EMAIL_PATTERN.test(trimmed)) {
    throw invalid("Escribe un email válido.");
  }
  return trimmed;
}

export type HostInput = { name: string; voiceName: string };

// A host as the client sends it and the queries return it; in a result,
// null = one-voice narration.
export const hostInput = v.object({ name: v.string(), voiceName: v.string() });
export const hostsResult = v.union(v.array(hostInput), v.null());

export const publicHosts = (
  hosts: Doc<"podcasts">["hosts"],
): HostInput[] | null =>
  hosts?.map((h) => ({ name: h.name, voiceName: voiceNameOf(h.voiceId) })) ??
  null;

/**
 * A conversation's hosts (names trimmed) and turns; null for narration; a
 * VALIDATION error if they don't fit. The first host speaks with voiceName.
 */
export function checkDialogue(
  script: string,
  voiceName: string,
  hosts: HostInput[] | undefined,
): { hosts: [HostInput, HostInput]; turns: Turn[] } | null {
  if (hosts === undefined) return null;
  const nameError = hostNamesError(hosts.map((h) => h.name));
  if (nameError) throw invalid(nameError);
  const [first, second] = hosts as [HostInput, HostInput];
  if (!hosts.every((h) => VOICES.some((voice) => voice.name === h.voiceName))) {
    throw invalid("Voz no disponible.");
  }
  if (first.voiceName === second.voiceName) {
    throw invalid("Elige dos voces distintas.");
  }
  if (first.voiceName !== voiceName) {
    throw invalid("La voz 1 no coincide con la voz del episodio.");
  }
  const named: [HostInput, HostInput] = [
    { name: first.name.trim(), voiceName: first.voiceName },
    { name: second.name.trim(), voiceName: second.voiceName },
  ];
  const dialogue = parseDialogue(script, [named[0].name, named[1].name]);
  if (!dialogue.ok) throw invalid(dialogue.error);
  return { hosts: named, turns: dialogue.turns };
}

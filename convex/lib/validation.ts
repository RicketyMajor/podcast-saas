import { ConvexError } from "convex/values";

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

import { ConvexError } from "convex/values";

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

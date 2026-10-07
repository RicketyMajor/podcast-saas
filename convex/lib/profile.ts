import {
  BIO_MAX_CHARS,
  DISPLAY_NAME_MAX_CHARS,
  WEBSITE_MAX_CHARS,
} from "./limits";

// Shared by users.updateProfile and the settings form (lib/validations).
export type ProfileInput = {
  displayName: string;
  bio: string;
  website: string;
};

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

/** What gets stored: trimmed, the bio on one line; "" = clear the field. */
export function cleanProfile(input: ProfileInput): ProfileInput {
  return {
    displayName: input.displayName.trim(),
    bio: oneLine(input.bio),
    website: input.website.trim(),
  };
}

export function displayNameError(value: string) {
  return value.trim().length > DISPLAY_NAME_MAX_CHARS
    ? `El nombre no puede superar ${DISPLAY_NAME_MAX_CHARS} caracteres.`
    : null;
}

export function bioError(value: string) {
  return oneLine(value).length > BIO_MAX_CHARS
    ? `La bio no puede superar ${BIO_MAX_CHARS} caracteres.`
    : null;
}

/** https only: the profile renders it as a link, so no javascript: or http. */
export function websiteError(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > WEBSITE_MAX_CHARS) {
    return `El enlace no puede superar ${WEBSITE_MAX_CHARS} caracteres.`;
  }
  if (!/^https:\/\//i.test(trimmed)) {
    return "El enlace debe empezar con https://.";
  }
  try {
    new URL(trimmed);
    return null;
  } catch {
    return "Escribe un enlace válido, por ejemplo https://tusitio.com.";
  }
}

/** The first problem, in Spanish, or null. */
export function profileError(input: ProfileInput) {
  return (
    displayNameError(input.displayName) ??
    bioError(input.bio) ??
    websiteError(input.website)
  );
}

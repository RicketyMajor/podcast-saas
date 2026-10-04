const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
// Control characters XML 1.0 forbids (tab, LF and CR are allowed).
const INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** User text as an XML text node or attribute value. */
export const escapeXml = (text: string) =>
  text.replace(INVALID, "").replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);

/** Markup inside CDATA; a literal "]]>" is split across two sections. */
export const cdata = (text: string) =>
  `<![CDATA[${text.replace(INVALID, "").replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

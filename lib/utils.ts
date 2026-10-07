import { ConvexError } from "convex/values";

export { cn } from "cn";

const GENERIC_ERROR = "Algo salió mal. Inténtalo de nuevo.";

/** The Spanish message a Convex function threw on purpose, else a generic one. */
export const errorMessage = (err: unknown) =>
  err instanceof ConvexError
    ? String((err.data as { message?: string }).message ?? GENERIC_ERROR)
    : GENERIC_ERROR;

// Only same-origin paths: blocks open redirects like `//evil.com` or `https://…`.
export function safeRedirectPath(path: string | string[] | undefined) {
  return typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
    ? path
    : "/";
}

// Spanish CLDR skips the separator below 10.000 ("5000"); the UI wants "5.000".
const countFormat = new Intl.NumberFormat("es", { useGrouping: "always" });
export const formatCount = (n: number) => countFormat.format(n);

/** (4, "episodio", "episodios") → "4 episodios" */
export const formatCountOf = (n: number, one: string, many: string) =>
  `${formatCount(n)} ${n === 1 ? one : many}`;

/** 265.1 → "4:25" */
export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

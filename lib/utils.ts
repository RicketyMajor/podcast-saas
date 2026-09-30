export { cn } from "cn";

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

/** 265.1 → "4:25" */
export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

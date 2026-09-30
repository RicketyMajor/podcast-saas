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

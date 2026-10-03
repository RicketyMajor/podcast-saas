import Link from "next/link";

const linkClass =
  "rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function LegalLinks({ prefix }: { prefix?: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      {prefix}
      <Link href="/terms" className={linkClass}>
        Condiciones del servicio
      </Link>
      {prefix ? " y la " : " · "}
      <Link href="/privacy" className={linkClass}>
        Política de privacidad
      </Link>
    </p>
  );
}

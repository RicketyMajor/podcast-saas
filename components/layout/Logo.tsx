import { AudioLines } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-xl font-bold tracking-tight"
    >
      <AudioLines aria-hidden className="size-6 text-primary" />
      Waves
    </Link>
  );
}

import { AudioLines } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md text-xl font-bold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <AudioLines aria-hidden className="size-6 text-primary" />
      Waves
    </Link>
  );
}

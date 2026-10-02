"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/** Keeps `?search=` in sync with the input, 300 ms after the last keystroke. */
export function Searchbar({ search }: { search: string }) {
  const router = useRouter();
  const [value, setValue] = useState(search);
  const [synced, setSynced] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL changed from outside (e.g. "Limpiar búsqueda"): follow it.
  if (search !== synced) {
    setSynced(search);
    setValue(search);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // ponytail: debounced in the handler instead of a useDebounce hook, so an
  // outside URL change never races a pending effect.
  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const term = next.trim();
      setSynced(term); // our own navigation: don't treat it as outside
      router.replace(
        term ? `/discover?search=${encodeURIComponent(term)}` : "/discover",
        { scroll: false },
      );
    }, DEBOUNCE_MS);
  }

  return (
    <div role="search" className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Busca por título o creador"
        aria-label="Busca por título o creador"
        maxLength={100}
        className="h-11 pl-10"
      />
    </div>
  );
}

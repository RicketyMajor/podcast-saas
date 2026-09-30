"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const user = useQuery(api.users.current);

  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ label, href, icon: Icon, requiresAuth }) => {
        if (requiresAuth && !user) return null;
        const target = requiresAuth && user ? `${href}/${user._id}` : href;
        const active = isActive(pathname, target);

        return (
          <li key={href}>
            <Link
              href={target}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                // The amber bar is the "on air" light: only the active item gets it.
                "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                "before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity",
                active && "text-primary before:opacity-100 hover:text-primary",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

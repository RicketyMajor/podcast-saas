"use client";

import { useQuery } from "convex/react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

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
  // Sidebar and mobile sheet can both be mounted: each gets its own pill.
  const group = useId();

  return (
    <LayoutGroup id={group}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon, requiresAuth }) => {
          if (requiresAuth && !user) return null;
          const target = requiresAuth && user ? `${href}/${user._id}` : href;
          const active = isActive(pathname, target);

          return (
            <li key={href} className="relative">
              {/* The active pill glides between items on navigation. */}
              {active && (
                <motion.span
                  layoutId="nav-active"
                  aria-hidden
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="absolute inset-0 rounded-xl bg-foreground/10 ring-1 ring-foreground/8"
                />
              )}
              <Link
                href={target}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  !active && "hover:bg-foreground/5",
                  active && "font-semibold text-foreground",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-5 shrink-0", active && "text-ambient")}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}

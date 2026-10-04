"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ITEM = "w-40 shrink-0 snap-start sm:w-48";

/** Horizontal, snap-scrolling row. Reorders glide in place (FLIP). */
export function Shelf<T extends { _id: string }>({
  title,
  items,
  renderItem,
}: {
  title: string;
  /** `undefined` = loading (skeletons). */
  items: T[] | undefined;
  renderItem: (item: T) => ReactNode;
}) {
  // Several shelves can share a page: each labels itself with its own id.
  const titleId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  // Arrows reflect what's actually scrollable: disabled at each end.
  const [edges, setEdges] = useState({ start: true, end: true });
  const measure = () => {
    const list = listRef.current;
    if (!list) return;
    setEdges({
      start: list.scrollLeft <= 1,
      end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
    });
  };
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items]);
  const scroll = (dir: 1 | -1) => {
    const list = listRef.current;
    list?.scrollBy({ left: dir * list.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-[1.375rem] font-bold tracking-tight">
          {title}
        </h2>
        <div className="hidden gap-1 sm:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full"
            aria-label={`Desplazar ${title} a la izquierda`}
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full"
            aria-label={`Desplazar ${title} a la derecha`}
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      {items === undefined ? (
        <div
          className="flex gap-4 overflow-hidden"
          role="status"
          aria-busy="true"
          aria-label={`Cargando ${title}`}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${ITEM} flex flex-col gap-3`}>
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        // Negative margin + padding: hover lift, focus rings and the show stack
        // (ShowCard) aren't clipped.
        <ul
          ref={listRef}
          onScroll={measure}
          className="-mx-4 -my-5 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain px-4 py-5 lg:-mx-10 lg:scroll-px-10 lg:px-10"
        >
          {items.map((item, i) => (
            <motion.li
              key={item._id}
              layout="position"
              initial={{ x: 24 }}
              animate={{ x: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: Math.min(i, 8) * 0.05,
              }}
              className={ITEM}
            >
              {renderItem(item)}
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

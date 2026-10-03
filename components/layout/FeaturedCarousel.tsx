"use client";

import { useQuery } from "convex/react";
import { AudioLines, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export function FeaturedCarousel() {
  // #1 already leads Home as the hero; the rail features the next five.
  const featured = useQuery(api.podcasts.getTrending, { limit: 6 })?.slice(1);
  const [carousel, setCarousel] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!carousel) return;
    const onSelect = () => setSelected(carousel.selectedScrollSnap());
    onSelect();
    carousel.on("select", onSelect).on("reInit", onSelect);
    return () => {
      carousel.off("select", onSelect).off("reInit", onSelect);
    };
  }, [carousel]);

  if (featured?.length === 0) return null;

  return (
    <section aria-labelledby="featured" className="flex flex-col gap-3">
      <h2 id="featured" className="text-lg font-bold tracking-tight">
        Destacados
      </h2>
      {featured === undefined ? (
        <Skeleton
          aria-label="Cargando destacados"
          className="aspect-square w-full max-w-48 rounded-2xl"
        />
      ) : (
        <Carousel
          setApi={setCarousel}
          opts={{ loop: true }}
          aria-label="Podcasts destacados"
          className="flex flex-col gap-3"
        >
          <CarouselContent>
            {featured.map((podcast, i) => (
              <CarouselItem
                key={podcast._id}
                aria-label={`${i + 1} de ${featured.length}`}
              >
                <Link
                  href={`/podcasts/${podcast._id}`}
                  className="group flex flex-col gap-2 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="relative aspect-square w-full max-w-48 overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/8">
                    {podcast.imageUrl ? (
                      <Image
                        src={podcast.imageUrl}
                        alt=""
                        fill
                        sizes="192px"
                        className="object-cover"
                      />
                    ) : (
                      <AudioLines
                        aria-hidden
                        className="absolute inset-0 m-auto size-10 text-muted-foreground"
                      />
                    )}
                  </div>
                  <span className="line-clamp-2 font-semibold text-pretty group-hover:underline">
                    {podcast.title}
                  </span>
                  <span className="-mt-1.5 truncate text-sm text-muted-foreground">
                    {podcast.authorName}
                  </span>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          {featured.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                aria-label="Destacado anterior"
                onClick={() => carousel?.scrollPrev()}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <div className="flex items-center gap-1">
                {featured.map((podcast, i) => (
                  <button
                    key={podcast._id}
                    type="button"
                    aria-label={`Ir al destacado ${i + 1}`}
                    aria-current={i === selected}
                    onClick={() => carousel?.scrollTo(i)}
                    // 24px hit area around an 8px dot.
                    className="group/dot flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full bg-muted-foreground/40 transition-[width,background-color] duration-300 ease-out-expo group-hover/dot:bg-muted-foreground",
                        i === selected &&
                          "w-5 bg-foreground group-hover/dot:bg-foreground",
                      )}
                    />
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full"
                aria-label="Destacado siguiente"
                onClick={() => carousel?.scrollNext()}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
        </Carousel>
      )}
    </section>
  );
}

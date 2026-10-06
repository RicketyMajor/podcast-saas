"use client";

import { useQuery } from "convex/react";
import { Check, ChevronDown, ExternalLink, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn, formatCount } from "@/lib/utils";

import { CopyFeedButton } from "./CopyFeedButton";

const LINK =
  "inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const APPLE_STEPS = [
  "Entra con tu cuenta de Apple.",
  "Pulsa «+» → «New Show» → «Add a show with an RSS feed».",
  "Pega el enlace RSS, completa los datos y publica. Apple lo revisa antes de mostrarlo.",
];
const SPOTIFY_STEPS = [
  "Elige «Find an existing show» → «Somewhere else».",
  "Pega el enlace RSS.",
  "Escribe el código de 8 dígitos que llega a tu email.",
];

/**
 * Only the author sees it (getDirectoryStatus is null for anyone else), and
 * only once the show has a feed. Starts closed: it's a to-do, not the page.
 */
export function DirectoryPanel({ showId }: { showId: Id<"shows"> }) {
  const status = useQuery(api.shows.getDirectoryStatus, { showId });
  if (!status || status.episodeCount === 0) return null;

  const missingNotice = status.withoutDisclosure;
  const pending = (missingNotice > 0 ? 1 : 0) + (status.email ? 0 : 1);

  return (
    // Stage panel, not glass (DESIGN.md › Elevation).
    <details className="group rounded-2xl bg-card/60 ring-1 ring-foreground/8">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-pretty">
          Publica en Apple Podcasts y Spotify
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          {pending === 0
            ? "Listo"
            : `${pending} ${pending === 1 ? "pendiente" : "pendientes"}`}
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180 motion-reduce:transition-none"
          />
        </span>
      </summary>

      <div className="flex flex-col gap-6 border-t border-foreground/8 px-4 py-5 sm:px-6 sm:py-6">
        <ul className="flex flex-col gap-3 text-sm">
          <Item done={missingNotice === 0}>
            {missingNotice === 0 ? (
              "Todos los episodios incluyen el aviso hablado de IA."
            ) : (
              <>
                <span className="tabular-nums">
                  {formatCount(missingNotice)}
                </span>{" "}
                {missingNotice === 1
                  ? "episodio no tiene"
                  : "episodios no tienen"}{" "}
                el aviso hablado de IA, y Apple lo exige. Edítalos, marca
                «Incluir aviso hablado de IA» y vuelve a generar el audio.
              </>
            )}
          </Item>
          <Item done={status.email !== null}>
            {status.email ? (
              <>
                Spotify enviará su código de verificación a{" "}
                <span className="break-all">{status.email}</span>.
              </>
            ) : (
              <>
                Spotify necesita un email en el feed para verificar que el show
                es tuyo.{" "}
                <Link href={`/shows/${showId}/edit`} className={LINK}>
                  Agrégalo en Editar show
                </Link>
              </>
            )}
          </Item>
        </ul>

        <div>
          <CopyFeedButton showId={showId} />
        </div>

        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <Steps
            title="Apple Podcasts"
            href="https://podcastsconnect.apple.com/"
            linkLabel="Abrir Apple Podcasts Connect"
            steps={APPLE_STEPS}
          />
          <Steps
            title="Spotify"
            href="https://creators.spotify.com/"
            linkLabel="Abrir Spotify for Creators"
            steps={SPOTIFY_STEPS}
          />
        </div>
      </div>
    </details>
  );
}

// Pending items read brighter than done ones: no color but ivory here.
function Item({ done, children }: { done: boolean; children: ReactNode }) {
  const Icon = done ? Check : TriangleAlert;
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-pretty",
        done ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="sr-only">{done ? "Listo: " : "Pendiente: "}</span>
        {children}
      </span>
    </li>
  );
}

function Steps({
  title,
  href,
  linkLabel,
  steps,
}: {
  title: string;
  href: string;
  linkLabel: string;
  steps: string[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-bold tracking-[-0.02em]">{title}</h3>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground marker:tabular-nums">
        {steps.map((step) => (
          <li key={step} className="text-pretty">
            {step}
          </li>
        ))}
      </ol>
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
        {linkLabel}
        <ExternalLink aria-hidden className="size-3.5" />
        <span className="sr-only">(se abre en otra pestaña)</span>
      </a>
    </section>
  );
}

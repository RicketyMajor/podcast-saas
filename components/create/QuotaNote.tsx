"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

const NOUNS = { audio: "audios", image: "portadas", script: "guiones" };

/** "Te quedan 7 de 10 audios hoy." — empty while loading or signed out. */
export function QuotaNote({ kind }: { kind: keyof typeof NOUNS }) {
  const quota = useQuery(api.ai.generations.getRemaining)?.[kind];
  if (!quota) return null;
  if (quota.remaining === 0) {
    return "Alcanzaste el límite diario de generaciones. Vuelve mañana.";
  }
  return `Te quedan ${quota.remaining} de ${quota.limit} ${NOUNS[kind]} hoy.`;
}

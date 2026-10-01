import { Compass, Home, Mic, User, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  // Shown only with a session; its href gets the current user's id appended.
  requiresAuth?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Descubrir", href: "/discover", icon: Compass },
  { label: "Crear podcast", href: "/create-podcast", icon: Mic },
  { label: "Mi perfil", href: "/profile", icon: User, requiresAuth: true },
];

export const EMPTY_STATES = {
  comingSoon: {
    title: "Próximamente",
    description: "Estamos preparando esta sección.",
  },
  noPodcasts: {
    title: "Aún no hay podcasts. ¡Publica el primero!",
    description: "Escribe un guion, elige una voz y la IA hace el resto.",
  },
} as const;

export const SPEAKING_RATE_LABELS: Record<number, string> = {
  0.9: "Lenta",
  1: "Normal",
  1.15: "Rápida",
};

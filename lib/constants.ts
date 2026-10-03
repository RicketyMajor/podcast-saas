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

// The logo's five bars drawn as a wave (viewBox 25×24). Here, not in the
// client Logo module, so server components (404) can read the array too.
export const WAVE_BARS = [
  { x: 1, h: 8, delay: "-0.2s" },
  { x: 6, h: 16, delay: "-0.6s" },
  { x: 11, h: 22, delay: "0s" },
  { x: 16, h: 14, delay: "-0.4s" },
  { x: 21, h: 6, delay: "-0.8s" },
];

// Privacy requests and abuse reports (/privacy, /terms).
export const CONTACT_EMAIL = "alonsoveralarach@gmail.com";

export const EMPTY_STATES = {
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

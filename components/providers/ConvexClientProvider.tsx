"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { MotionConfig } from "motion/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      {/* App-wide: under prefers-reduced-motion, motion drops transforms and
          layout animations but keeps opacity and color (DESIGN.md). */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ConvexAuthNextjsProvider>
  );
}

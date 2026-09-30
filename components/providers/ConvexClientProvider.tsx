"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

// Phase 2 swaps this for ConvexAuthNextjsProvider.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

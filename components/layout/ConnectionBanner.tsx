"use client";

import { useConvexConnectionState } from "convex/react";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

// Offline, Convex keeps the last data and holds mutations until it
// reconnects; without this a pending "Publicar" would just spin. The delay
// hides the brief reconnects that happen on auth refresh.
export function ConnectionBanner() {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  const disconnected = hasEverConnected && !isWebSocketConnected;
  const [waited, setWaited] = useState(false);
  const show = disconnected && waited;

  useEffect(() => {
    if (!disconnected) return;
    const timer = setTimeout(() => setWaited(true), 2000);
    return () => {
      clearTimeout(timer);
      setWaited(false);
    };
  }, [disconnected]);

  return (
    <div role="status" aria-live="polite">
      {show && (
        <p className="flex items-center justify-center gap-2 border-b border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          <WifiOff aria-hidden className="size-4 shrink-0" />
          Sin conexión. Reintentando… Los cambios se guardarán al volver.
        </p>
      )}
    </div>
  );
}

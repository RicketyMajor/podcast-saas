"use client";

import { useEffect } from "react";

// Shared by the episode, show and profile forms: "guardar" fits all three.
const MESSAGE = "Tienes cambios sin guardar. ¿Salir de todos modos?";

/**
 * While `active`, asks before leaving: reload/close via beforeunload, and
 * in-app links via a capture listener that runs before Next's <Link>.
 * ponytail: the browser's back button isn't covered; Next has no navigation
 * blocking API, so that needs a history trap if it ever matters.
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
      if (event.shiftKey || event.altKey) return; // opens elsewhere
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
        return;
      }
      const sameOrigin = link.origin === location.origin;
      const samePage =
        link.pathname === location.pathname && link.search === location.search;
      if (!sameOrigin || samePage) return; // beforeunload covers other sites
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}

const TEXT = "text/plain; charset=utf-8";

// Podcast apps poll feeds: the CDN answers repeats for 5 min.
export const cached = (body: string, type: string) =>
  new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });

export const notFound = (message: string) =>
  new Response(message, {
    status: 404,
    headers: { "Content-Type": TEXT, "Cache-Control": "public, s-maxage=60" },
  });

// Never cached: the next poll should retry.
export const unavailable = () =>
  new Response("Servicio no disponible. Intenta de nuevo en un minuto.", {
    status: 503,
    headers: {
      "Content-Type": TEXT,
      "Cache-Control": "no-store",
      "Retry-After": "60",
    },
  });

// Covers and audio change URL when they change (?v=<storageId>), so the CDN
// can keep them for a day.
export const cachedImage = (body: Uint8Array<ArrayBuffer>) =>
  new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });

export const redirect = (url: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "public, s-maxage=86400" },
  });

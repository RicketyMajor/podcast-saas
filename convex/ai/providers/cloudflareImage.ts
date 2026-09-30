import { ConvexError } from "convex/values";

import { CLOUDFLARE_IMAGE } from "../config";
import { errorDetail, fetchWithRetry } from "./http";
import type { ImageProvider } from "./types";

// Goes after the user's prompt so their subject and style lead. FLUX has no
// negative prompt, and naming "podcast", "cover" or "text" makes it draw
// letters (tested 2026-09-30), so the guide only fixes the composition.
const GUIDE =
  "Square artwork with a centered subject and a clean, uncluttered composition. Purely visual, without any lettering, words or logos.";

const aiFailed = () =>
  new ConvexError({
    code: "AI_FAILED",
    message: "No pudimos generar la portada. Inténtalo de nuevo.",
  });

function mimeTypeOf(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp"; // RIFF….WEBP
  return null;
}

export function cloudflareImage(
  accountId: string,
  apiToken: string,
): ImageProvider {
  return {
    id: "cloudflare",
    async generate({ prompt }) {
      let res: Response;
      try {
        res = await fetchWithRetry(CLOUDFLARE_IMAGE.endpoint(accountId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            prompt: `${prompt.replace(/[.\s]+$/, "")}. ${GUIDE}`,
            steps: CLOUDFLARE_IMAGE.steps,
          }),
        });
      } catch {
        throw aiFailed();
      }

      if (!res.ok) {
        console.error(`Cloudflare ${res.status}: ${await errorDetail(res)}`);
        if (res.status === 429) {
          throw new ConvexError({
            code: "QUOTA_EXCEEDED",
            message:
              "Se agotó el cupo gratuito de portadas por hoy. Sube una imagen o vuelve mañana.",
          });
        }
        // ponytail: input is validated before the call, so a 400 is treated
        // as a content rejection; split by error code if that proves wrong.
        if (res.status === 400) {
          throw new ConvexError({
            code: "AI_BLOCKED",
            message:
              "El proveedor de IA no pudo procesar este contenido. Prueba con otra descripción.",
          });
        }
        throw aiFailed();
      }

      const data = (await res.json()) as { result?: { image?: string } };
      const base64 = data.result?.image;
      if (!base64) throw aiFailed();
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const mimeType = mimeTypeOf(bytes);
      if (!mimeType) throw aiFailed();
      return { bytes, mimeType };
    },
  };
}

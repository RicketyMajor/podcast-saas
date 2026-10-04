import { z } from "zod";

import { LANGUAGES } from "@/convex/ai/voices";
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  SHOW_CATEGORIES,
  TITLE_MAX_CHARS,
  TITLE_MIN_CHARS,
} from "@/convex/lib/limits";

import { text } from "./podcast";

export const showFormSchema = z.object({
  title: text("El título", TITLE_MIN_CHARS, TITLE_MAX_CHARS),
  description: text(
    "La descripción",
    DESCRIPTION_MIN_CHARS,
    DESCRIPTION_MAX_CHARS,
  ),
  languageCode: z.enum(
    LANGUAGES.map((l) => l.code),
    { error: "Elige un idioma." },
  ),
  category: z.enum(
    SHOW_CATEGORIES.map((c) => c.value),
    { error: "Elige una categoría." },
  ),
  explicit: z.boolean(),
});

export type ShowFormValues = z.infer<typeof showFormSchema>;

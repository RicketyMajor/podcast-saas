"use client";

import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { ImageUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";

import { GenerationProgress } from "@/components/create/GenerationProgress";
import { QuotaNote } from "@/components/create/QuotaNote";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  COVER_TYPES,
  IMAGE_PROMPT_MAX_CHARS,
  IMAGE_PROMPT_MIN_CHARS,
  UPLOAD_MAX_MB,
} from "@/convex/lib/limits";
import { cn, formatCount } from "@/lib/utils";
import { coverFileError } from "@/lib/validations/podcast";

export type Thumbnail = {
  storageId?: Id<"_storage">; // undefined = the published file, unchanged
  url: string;
  source: "ai" | "upload";
  prompt?: string;
};

const GENERIC_ERROR = "Algo salió mal. Inténtalo de nuevo.";

const messageOf = (err: unknown) =>
  err instanceof ConvexError
    ? String((err.data as { message?: string }).message ?? GENERIC_ERROR)
    : GENERIC_ERROR;

export function GenerateThumbnail({
  image,
  onImageChange,
}: {
  image: Thumbnail | null;
  onImageChange: (image: Thumbnail) => void;
}) {
  const generateThumbnail = useAction(api.ai.actions.generateThumbnail);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [prompt, setPrompt] = useState(image?.prompt ?? "");
  const [pending, setPending] = useState<"ai" | "upload" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const promptLength = prompt.trim().length;
  const canGenerate =
    promptLength >= IMAGE_PROMPT_MIN_CHARS &&
    promptLength <= IMAGE_PROMPT_MAX_CHARS;

  function replace(next: Thumbnail) {
    if (image?.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
    onImageChange(next);
  }

  function fail(message: string) {
    setError(message);
    toast.error(message);
  }

  async function handleGenerate() {
    setPending("ai");
    setError(null);
    try {
      const result = await generateThumbnail({ prompt: prompt.trim() });
      replace({ ...result, source: "ai", prompt: prompt.trim() });
      toast.success("Portada generada.");
    } catch (err) {
      fail(messageOf(err));
    } finally {
      setPending(null);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const invalid = coverFileError(file);
    if (invalid) return fail(invalid);

    setPending("upload");
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      // The local copy previews instantly; the storageId is what gets saved.
      replace({ storageId, url: URL.createObjectURL(file), source: "upload" });
      toast.success("Imagen subida.");
    } catch (err) {
      fail(messageOf(err));
    } finally {
      setPending(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!pending) void handleFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card/60 p-4 ring-1 ring-foreground/8 sm:p-6">
      {image && (
        // ponytail: unoptimized, it's a one-off preview (and blob: URLs can't be optimized).
        <Image
          key={image.url}
          src={image.url}
          alt="Vista previa de la portada"
          width={1024}
          height={1024}
          unoptimized
          loading="eager"
          // A new cover develops in from a blur, like a print.
          className="aspect-square w-full max-w-64 rounded-2xl object-cover shadow-2xl ring-1 shadow-black/60 ring-foreground/10 motion-safe:animate-in motion-safe:duration-700 motion-safe:zoom-in-95 motion-safe:blur-in"
        />
      )}

      <Tabs defaultValue="ai" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="ai" disabled={pending !== null}>
            <Sparkles aria-hidden />
            Generar con IA
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={pending !== null}>
            <ImageUp aria-hidden />
            Subir imagen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="thumbnail-prompt">
              Describe la imagen
            </FieldLabel>
            <Textarea
              id="thumbnail-prompt"
              rows={3}
              value={prompt}
              maxLength={IMAGE_PROMPT_MAX_CHARS}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Un faro en una costa rocosa al atardecer, estilo acuarela"
              aria-describedby="thumbnail-prompt-help"
            />
            <FieldDescription id="thumbnail-prompt-help">
              Describe la escena, el estilo y los colores. No pidas textos ni
              títulos: la IA no los escribe bien y el título ya se muestra
              aparte.
            </FieldDescription>
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant={image?.source === "ai" ? "outline" : "default"}
              className="h-11 rounded-full px-5 transition-transform active:scale-95"
              disabled={!canGenerate || pending !== null}
              onClick={handleGenerate}
            >
              {pending === "ai" ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : image?.source === "ai" ? (
                <RefreshCw aria-hidden />
              ) : (
                <Sparkles aria-hidden />
              )}
              {pending === "ai"
                ? "Generando portada…"
                : image?.source === "ai"
                  ? "Regenerar"
                  : "Generar portada"}
            </Button>
            {pending !== "ai" && (
              <p className="text-sm text-muted-foreground">
                {!canGenerate ? (
                  `Escribe al menos ${IMAGE_PROMPT_MIN_CHARS} caracteres (máximo ${formatCount(IMAGE_PROMPT_MAX_CHARS)}).`
                ) : (
                  <QuotaNote kind="image" />
                )}
              </p>
            )}
          </div>
          {pending === "ai" && (
            <GenerationProgress
              estimateMs={4000}
              phases={[
                "Imaginando la escena…",
                "Pintando la portada…",
                "Últimos retoques…",
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="upload">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
              dragging && "border-primary bg-muted/50",
              pending && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="file"
              accept={COVER_TYPES.join(",")}
              className="sr-only"
              disabled={pending !== null}
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = ""; // allow picking the same file again
              }}
            />
            {pending === "upload" ? (
              <Loader2
                aria-hidden
                className="size-8 animate-spin text-muted-foreground"
              />
            ) : (
              <ImageUp aria-hidden className="size-8 text-muted-foreground" />
            )}
            <span className="font-medium">
              {pending === "upload"
                ? "Subiendo imagen…"
                : "Arrastra una imagen o haz clic para elegirla"}
            </span>
            <span className="text-sm text-muted-foreground">
              PNG, JPG o WebP · hasta {UPLOAD_MAX_MB} MB · idealmente cuadrada
            </span>
          </label>
        </TabsContent>
      </Tabs>

      {error && !pending && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

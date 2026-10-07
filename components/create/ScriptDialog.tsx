"use client";

import { useAction } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";

import { GenerationProgress } from "@/components/create/GenerationProgress";
import { QuotaNote } from "@/components/create/QuotaNote";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { LANGUAGES } from "@/convex/ai/voices";
import { hostNamesError } from "@/convex/lib/dialogue";
import {
  SCRIPT_MINUTES,
  SCRIPT_TONES,
  SCRIPT_TOPIC_MAX_CHARS,
  SCRIPT_TOPIC_MIN_CHARS,
} from "@/convex/lib/limits";
import { errorMessage } from "@/lib/utils";
import type { PodcastFormValues } from "@/lib/validations/podcast";

const SELECT_TRIGGER = "h-11 w-full data-[size=default]:h-11";

export function ScriptDialog({
  control,
  onGenerated,
}: {
  control: Control<PodcastFormValues>;
  onGenerated: (script: string) => void;
}) {
  const generateScript = useAction(api.ai.actions.generateScript);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("3");
  const [tone, setTone] = useState<string>(SCRIPT_TONES[0]);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [languageCode, currentScript, format, hostNames] = useWatch({
    control,
    name: ["languageCode", "script", "format", "hostNames"],
  });
  const hosts =
    format === "conversation" ? hostNames.map((n) => n.trim()) : undefined;
  const hostsError = hosts ? hostNamesError(hosts) : null;
  const language = LANGUAGES.find((l) => l.code === languageCode);
  const replacing = currentScript.trim().length > 0;

  const topicLength = topic.trim().length;
  const topicError =
    topicLength < SCRIPT_TOPIC_MIN_CHARS
      ? `Escribe un tema de al menos ${SCRIPT_TOPIC_MIN_CHARS} caracteres.`
      : topicLength > SCRIPT_TOPIC_MAX_CHARS
        ? `El tema no puede superar ${SCRIPT_TOPIC_MAX_CHARS} caracteres.`
        : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // React bubbles events through portals: keep this submit away from PodcastForm.
    event.stopPropagation();
    setTouched(true);
    if (topicError || hostsError) return;
    setPending(true);
    setError(null);
    try {
      const { script } = await generateScript({
        topic: topic.trim(),
        languageCode,
        minutes: Number(minutes),
        tone,
        hosts,
      });
      onGenerated(script);
      setOpen(false);
      toast.success("Guion generado. Revísalo antes de generar el audio.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5 transition-transform active:scale-95"
        >
          <Sparkles aria-hidden />
          Generar guion con IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        {/* A separate <form>: the dialog is portaled outside PodcastForm. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>Generar guion con IA</DialogTitle>
            <DialogDescription>
              {hosts
                ? `Una conversación entre ${hosts[0]} y ${hosts[1]}, en ${language?.label ?? "el idioma elegido"}.`
                : `Se escribirá en ${language?.label ?? "el idioma elegido"}.`}{" "}
              Podrás editarlo antes de generar el audio.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={touched && !!topicError}>
              <FieldLabel htmlFor="script-topic">Tema</FieldLabel>
              <Textarea
                id="script-topic"
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && !!topicError}
                placeholder="Ej.: la historia del café y cómo llegó a Latinoamérica"
              />
              {touched && topicError && <FieldError>{topicError}</FieldError>}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="script-minutes">Duración</FieldLabel>
                <Select value={minutes} onValueChange={setMinutes}>
                  <SelectTrigger id="script-minutes" className={SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRIPT_MINUTES.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} {m === 1 ? "minuto" : "minutos"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="script-tone">Tono</FieldLabel>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="script-tone" className={SELECT_TRIGGER}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCRIPT_TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {replacing && (
              <FieldDescription>
                Ya tienes un guion: el nuevo lo reemplazará.
              </FieldDescription>
            )}
          </FieldGroup>

          {hostsError && (
            <p role="alert" className="text-sm text-destructive">
              Revisa los nombres de las voces: {hostsError}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {pending && (
            <GenerationProgress
              estimateMs={4000 + Number(minutes) * 2500}
              phases={[
                "Investigando el tema…",
                "Escribiendo el guion…",
                "Puliendo el texto…",
              ]}
            />
          )}

          <DialogFooter className="items-center">
            <p
              aria-live="polite"
              className="text-sm text-muted-foreground sm:mr-auto"
            >
              <QuotaNote kind="script" />
            </p>
            <Button
              type="submit"
              className="h-11 rounded-full px-5 transition-transform active:scale-95"
              disabled={pending || hostsError !== null}
            >
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              {pending
                ? "Escribiendo guion…"
                : replacing
                  ? "Reemplazar guion"
                  : "Generar guion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

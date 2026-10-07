"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { LegalLinks } from "@/components/layout/LegalLinks";
import { PillButton } from "@/components/shared/PillButton";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DISPLAY_NAME_MAX_CHARS } from "@/convex/lib/limits";

type Mode = "signIn" | "signUp";
type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;

// Mirrors convex/auth.ts; the server re-validates.
const MIN_PASSWORD_LENGTH = 8;

const COPY = {
  signIn: {
    title: "Inicia sesión",
    subtitle: "Bienvenido de nuevo a Waves.",
    submit: "Iniciar sesión",
    switchText: "¿No tienes cuenta?",
    switchLink: "Regístrate",
    switchHref: "/sign-up",
    // Same message for unknown email and wrong password: no account enumeration.
    failure: "Email o contraseña incorrectos.",
  },
  signUp: {
    title: "Crea tu cuenta",
    subtitle: "Empieza a publicar podcasts en minutos.",
    submit: "Crear cuenta",
    switchText: "¿Ya tienes cuenta?",
    switchLink: "Inicia sesión",
    switchHref: "/sign-in",
    // Password's "account already exists" error is redacted in production.
    failure:
      "No pudimos crear la cuenta. Si ya tienes una con este email, inicia sesión.",
  },
} as const;

function validate(mode: Mode, data: FormData): Errors {
  const errors: Errors = {};
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");

  if (mode === "signUp" && !name) errors.name = "Escribe tu nombre.";
  if (name.length > DISPLAY_NAME_MAX_CHARS)
    errors.name = `Máximo ${DISPLAY_NAME_MAX_CHARS} caracteres.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Escribe un email válido.";
  if (!password) errors.password = "Escribe tu contraseña.";
  else if (mode === "signUp" && password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return errors;
}

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: Mode;
  redirectTo: string;
}) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];
  const query =
    redirectTo === "/" ? "" : `?redirectTo=${encodeURIComponent(redirectTo)}`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fieldErrors = validate(mode, data);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setPending(true);
    try {
      await signIn("password", data);
      router.push(redirectTo);
    } catch (error) {
      const message =
        mode === "signUp" &&
        error instanceof ConvexError &&
        typeof error.data?.message === "string"
          ? error.data.message
          : copy.failure;
      setErrors({ form: message });
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-tight font-extrabold tracking-[-0.025em]">
          {copy.title}
        </h1>
        <p className="text-muted-foreground">{copy.subtitle}</p>
      </header>

      <GoogleButton redirectTo={redirectTo} disabled={pending} />

      <FieldSeparator>o</FieldSeparator>

      <form onSubmit={onSubmit} noValidate>
        <input type="hidden" name="flow" value={mode} />
        <FieldGroup>
          {mode === "signUp" && (
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                id="name"
                className="h-11"
                name="name"
                autoComplete="name"
                maxLength={DISPLAY_NAME_MAX_CHARS}
                aria-invalid={!!errors.name}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
          )}
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              className="h-11"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <Input
              id="password"
              className="h-11"
              name="password"
              type="password"
              autoComplete={
                mode === "signUp" ? "new-password" : "current-password"
              }
              aria-invalid={!!errors.password}
            />
            <FieldError>{errors.password}</FieldError>
          </Field>
          <FieldError>{errors.form}</FieldError>
          <PillButton type="submit" disabled={pending} className="mt-1">
            {pending && <Loader2 aria-hidden className="animate-spin" />}
            {copy.submit}
          </PillButton>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {copy.switchText}{" "}
        <Link
          href={copy.switchHref + query}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {copy.switchLink}
        </Link>
      </p>

      <div className="text-center">
        <LegalLinks prefix="Al continuar aceptas las " />
      </div>
    </div>
  );
}

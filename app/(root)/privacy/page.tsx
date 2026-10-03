import type { Metadata } from "next";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <article className="flex max-w-2xl flex-col gap-6 text-pretty [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p,&_ul]:text-muted-foreground">
      <SectionHeader as="h1" title="Política de privacidad" />
      <p>Última actualización: 2 de octubre de 2026.</p>

      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          Tu cuenta: nombre, email y, si entras con Google, tu foto de perfil.
          Si usas email y contraseña, la contraseña se guarda cifrada (hash).
        </li>
        <li>
          Lo que creas: guiones, títulos, descripciones, audios, portadas y las
          descripciones que escribes para generarlas.
        </li>
        <li>
          Uso: reproducciones de cada podcast y un registro de tus generaciones
          con IA para aplicar los cupos diarios.
        </li>
      </ul>
      <p>
        Tu nombre, tu foto y los podcasts que publicas son públicos. Tu email
        nunca se muestra.
      </p>

      <h2>Con quién se procesan</h2>
      <ul>
        <li>Convex: base de datos, archivos y autenticación.</li>
        <li>Vercel: aloja el sitio web.</li>
        <li>Google Cloud Text-to-Speech: convierte tu guion en audio.</li>
        <li>
          Cloudflare Workers AI: genera portadas a partir de tu descripción.
        </li>
        <li>
          Google Gemini: genera guiones a partir del tema que escribes. Usamos
          su capa gratuita, en la que Google puede usar lo que envías para
          mejorar sus productos. No escribas datos personales en el tema.
        </li>
        <li>Google: inicio de sesión, si eliges entrar con Google.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas tu cuenta. Los audios y portadas que generas y no
        publicas se borran automáticamente en uno o dos días. Cuando borras un
        podcast, se borran también su audio y su portada.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedir una copia de tus datos o que borremos tu cuenta y todo su
        contenido escribiendo a{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}

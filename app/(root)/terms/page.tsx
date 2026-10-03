import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Condiciones del servicio" };

export default function TermsPage() {
  return (
    <article className="flex max-w-2xl flex-col gap-6 text-pretty [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p,&_ul]:text-muted-foreground">
      <SectionHeader as="h1" title="Condiciones del servicio" />
      <p>Última actualización: 2 de octubre de 2026.</p>

      <h2>El servicio</h2>
      <p>
        Waves te permite crear podcasts con voces, guiones y portadas generados
        con inteligencia artificial, publicarlos y escuchar los de otras
        personas. Es gratuito, tiene cupos diarios de generación y se ofrece
        &quot;tal cual&quot;, sin garantía de disponibilidad: puede cambiar,
        interrumpirse o cerrar.
      </p>

      <h2>Lo que no está permitido</h2>
      <ul>
        <li>
          Hacerte pasar por otra persona o presentar el audio como si fuera la
          voz real de alguien.
        </li>
        <li>
          Publicar contenido ilegal, que incite al odio o a la violencia, que
          acose a otras personas o que infrinja derechos de autor.
        </li>
        <li>
          Abusar del servicio: automatizar cuentas, saltarse los cupos o
          intentar acceder a datos de otras personas.
        </li>
      </ul>
      <p>Podemos borrar contenido o cuentas que incumplan estas reglas.</p>

      <h2>Tu contenido</h2>
      <p>
        Lo que creas es tuyo y eres responsable de ello. Al publicarlo nos
        autorizas a alojarlo y mostrarlo en Waves. Todo el audio es generado con
        IA y se indica como tal.
      </p>

      <h2>Privacidad y contacto</h2>
      <p>
        Cómo tratamos tus datos está en la{" "}
        <Link
          href="/privacy"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Política de privacidad
        </Link>
        . Dudas o reportes:{" "}
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

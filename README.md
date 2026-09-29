# Ondas

Plataforma para crear, alojar y escuchar podcasts generados con IA. Escribes (o generas) un guion, eliges voz e idioma, la app produce el audio con text-to-speech, creas una portada con IA o la subes, y publicas. Los oyentes descubren, buscan y escuchan con un reproductor que no se corta al navegar.

> En desarrollo.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui
- Convex (base de datos, funciones, storage, búsqueda) · Convex Auth
- Voz: Google Cloud Text-to-Speech · Portadas: Cloudflare Workers AI · Guion: Gemini API
- Despliegue: Vercel

## Desarrollo local

Requisitos: Node.js 24 LTS.

```bash
npm install
npm run dev          # http://localhost:3000
```

Scripts: `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`.

Variables de entorno: ver `.env.example`.

## Autor

Alonso Vera (Rickety Major)

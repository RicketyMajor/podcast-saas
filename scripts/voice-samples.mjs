// Generates short Chirp 3 HD voice samples as MP3.
//
//   $env:GOOGLE_TTS_API_KEY = "…"   (or read it with `npx convex env get GOOGLE_TTS_API_KEY`)
//   node scripts/voice-samples.mjs <outDir> <langs,comma,separated> [voices,comma,separated]
//
// Without a voice list it samples every Chirp 3 HD voice of each language
// (used to pick the catalog). Output: <outDir>/<lang>-<Voice>.mp3
// Each sample costs ~100 chars of the 1M/month free tier.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "https://texttospeech.googleapis.com/v1";
const TEXT = {
  es: (name) =>
    `Hola, soy ${name}. Bienvenidos a Waves, donde tus ideas se convierten en podcasts. ¿Empezamos?`,
  en: (name) =>
    `Hi, I'm ${name}. Welcome to Waves, where your ideas become podcasts. Shall we begin?`,
  pt: (name) =>
    `Olá, eu sou ${name}. Bem-vindos ao Waves, onde suas ideias viram podcasts. Vamos começar?`,
};

const key = process.env.GOOGLE_TTS_API_KEY;
const [outDir, langsArg, voicesArg] = process.argv.slice(2);
if (!key || !outDir || !langsArg) {
  console.error(
    "Usage: GOOGLE_TTS_API_KEY=… node scripts/voice-samples.mjs <outDir> <langs> [voices]",
  );
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "x-goog-api-key": key,
};

await mkdir(outDir, { recursive: true });

for (const lang of langsArg.split(",")) {
  const text = TEXT[lang.slice(0, 2)];
  if (!text) throw new Error(`No sample text for ${lang}`);

  let voices = voicesArg?.split(",");
  if (!voices) {
    const res = await fetch(`${API}/voices?languageCode=${lang}`, { headers });
    const { voices: all = [] } = await res.json();
    voices = all
      .filter((v) => v.name.includes("Chirp3-HD"))
      .map((v) => v.name.split("-").pop());
  }

  for (const voice of voices) {
    const res = await fetch(`${API}/text:synthesize`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: { text: text(voice) },
        voice: { languageCode: lang, name: `${lang}-Chirp3-HD-${voice}` },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });
    if (!res.ok) {
      console.error(`${lang} ${voice}: HTTP ${res.status}`);
      continue;
    }
    const { audioContent } = await res.json();
    const file = join(outDir, `${lang}-${voice}.mp3`);
    await writeFile(file, Buffer.from(audioContent, "base64"));
    console.log(file);
  }
}

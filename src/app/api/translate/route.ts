import { NextResponse } from "next/server";

/** DeepL przyjmuje do 50 tekstów w jednym zapytaniu. */
const MAX_TEXTS = 50;
const MAX_CHARS = 20000;

/** Podpowiedź dla DeepL – nie jest tłumaczona ani liczona do limitu znaków. */
const CONTEXT =
  "Raport godzin pracy z budowy dla holenderskiego zleceniodawcy. Teksty to nazwy budów (często nazwisko klienta i pomieszczenie, np. „Kowalscy – łazienka”) oraz krótkie opisy prac remontowo-budowlanych.";

type Body = { text?: string; texts?: string[]; target?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe zapytanie." }, { status: 400 });
  }

  const single = typeof body.text === "string";
  const texts = (single ? [body.text as string] : Array.isArray(body.texts) ? body.texts : [])
    .map((text) => (typeof text === "string" ? text.trim() : ""))
    .slice(0, MAX_TEXTS);

  if (!texts.some(Boolean)) {
    return NextResponse.json({ error: "Brakuje tekstu do tłumaczenia." }, { status: 400 });
  }
  if (texts.join("").length > MAX_CHARS) {
    return NextResponse.json({ error: "Za dużo tekstu naraz." }, { status: 413 });
  }

  const url = process.env.TRANSLATION_API_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  const provider = (process.env.TRANSLATION_PROVIDER ?? "").toLowerCase();

  if (!url) {
    return NextResponse.json(
      { error: "Tłumaczenie nie jest skonfigurowane na serwerze (brak TRANSLATION_API_URL)." },
      { status: 501 },
    );
  }

  const target = (body.target ?? "nl").toLowerCase();
  const useDeepL = provider === "deepl" || url.includes("deepl.com");

  try {
    const translations = useDeepL ? await translateDeepL(url, apiKey, texts, target) : await translateLibre(url, apiKey, texts, target);
    return single ? NextResponse.json({ translatedText: translations[0] }) : NextResponse.json({ translations });
  } catch (error) {
    const message = error instanceof TranslateError ? error.message : "Nie udało się połączyć z usługą tłumaczenia.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

class TranslateError extends Error {}

async function translateDeepL(url: string, apiKey: string | undefined, texts: string[], target: string): Promise<string[]> {
  if (!apiKey) throw new TranslateError("Brak klucza DeepL (TRANSLATION_API_KEY).");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `DeepL-Auth-Key ${apiKey}` },
    body: JSON.stringify({
      text: texts.map((text) => text || " "),
      source_lang: "PL",
      target_lang: target.toUpperCase(),
      context: CONTEXT,
      preserve_formatting: true,
    }),
  });

  if (response.status === 403) throw new TranslateError("DeepL odrzucił klucz – sprawdź TRANSLATION_API_KEY (darmowy klucz kończy się na „:fx” i wymaga adresu api-free.deepl.com).");
  if (response.status === 456) throw new TranslateError("Wyczerpany miesięczny limit znaków DeepL.");
  if (response.status === 429) throw new TranslateError("Za dużo zapytań do DeepL – spróbuj za chwilę.");
  if (!response.ok) throw new TranslateError(`DeepL zwrócił błąd (${response.status}).`);

  const payload = (await response.json()) as { translations?: Array<{ text?: string }> };
  const out = texts.map((original, index) => (original ? payload.translations?.[index]?.text ?? "" : ""));
  if (out.some((text, index) => texts[index] && !text)) throw new TranslateError("DeepL zwrócił niepełną odpowiedź.");
  return out;
}

async function translateLibre(url: string, apiKey: string | undefined, texts: string[], target: string): Promise<string[]> {
  const out: string[] = [];
  for (const text of texts) {
    if (!text) {
      out.push("");
      continue;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ q: text, source: "pl", target, format: "text", ...(apiKey ? { api_key: apiKey } : {}) }),
    });
    const payload = (await response.json().catch(() => ({}))) as { translatedText?: string; translation?: string; text?: string };
    const translated = payload.translatedText || payload.translation || payload.text;
    if (!response.ok || !translated) throw new TranslateError("Usługa tłumaczenia zwróciła błąd.");
    out.push(translated);
  }
  return out;
}

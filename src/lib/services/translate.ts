/**
 * Tłumaczenie tekstów użytkownika (nazwy budów, opisy) PL → NL dla raportów.
 * Raz przetłumaczony tekst trafia do pamięci przeglądarki, żeby nie zużywać limitu DeepL ponownie.
 */

const CACHE_KEY = "remmark:translations:nl";
const BATCH = 40;

type Cache = Record<string, string>;

function readCache(): Cache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  try {
    // Ograniczenie rozmiaru: zostaw ostatnie ~3000 wpisów.
    const entries = Object.entries(cache);
    const trimmed = entries.length > 3000 ? Object.fromEntries(entries.slice(-3000)) : cache;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // brak miejsca / brak localStorage – tłumaczenia zostaną tylko w pamięci
  }
}

const memory: Cache = {};

/** Zwraca mapę tekst → tłumaczenie NL. Rzuca błąd z czytelnym komunikatem, gdy usługa nie działa. */
export async function translateToDutch(texts: string[]): Promise<Map<string, string>> {
  const cache = { ...readCache(), ...memory };
  const unique = Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean)));
  const missing = unique.filter((text) => !cache[text]);

  for (let index = 0; index < missing.length; index += BATCH) {
    const chunk = missing.slice(index, index + BATCH);
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: chunk, target: "nl" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { translations?: string[]; error?: string };
    if (!response.ok || !payload.translations) throw new Error(payload.error || "Tłumaczenie nie zadziałało.");
    chunk.forEach((text, position) => {
      const translated = payload.translations?.[position];
      if (translated) {
        cache[text] = translated;
        memory[text] = translated;
      }
    });
  }

  if (missing.length) writeCache(cache);
  return new Map(unique.map((text) => [text, cache[text] ?? text]));
}

/** Usuwa zapamiętane tłumaczenia (np. po poprawce nazwy, żeby przetłumaczyć od nowa). */
export function clearTranslationCache(): void {
  Object.keys(memory).forEach((key) => delete memory[key]);
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignoruj
  }
}

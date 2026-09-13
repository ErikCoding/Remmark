import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; target?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Brakuje tekstu do tłumaczenia." }, { status: 400 });
  }

  const url = process.env.TRANSLATION_API_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;

  if (!url) {
    return NextResponse.json(
      { error: "Endpoint tłumaczenia nie jest skonfigurowany. Uzupełnij TRANSLATION_API_URL w .env.local." },
      { status: 501 },
    );
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        q: text,
        source: "pl",
        target: body.target ?? "nl",
        format: "text",
      }),
    });

    const payload = (await response.json()) as { translatedText?: string; translation?: string; text?: string };
    const translatedText = payload.translatedText || payload.translation || payload.text;

    if (!response.ok || !translatedText) {
      return NextResponse.json({ error: "Dostawca tłumaczenia zwrócił błąd." }, { status: 502 });
    }

    return NextResponse.json({ translatedText });
  } catch {
    return NextResponse.json({ error: "Nie udało się połączyć z usługą tłumaczenia." }, { status: 502 });
  }
}

# Remmark Worklog

Nowoczesna aplikacja webowa/PWA do szybkiego logowania pracy na budowach. Stack: Next.js, TypeScript, Tailwind CSS, Firebase Authentication i Cloud Firestore.

## Funkcje

- Logowanie przez Firebase Authentication bez publicznej rejestracji.
- Chronione widoki aplikacji z przekierowaniem do `/login`.
- Budowy z wyszukiwaniem, statusami i statystykami.
- Szybkie wpisy czasu pracy z opisem PL/NL i notatkami.
- Timer pracy zapisany w Firestore, odporny na odświeżenie i ponowne otwarcie aplikacji.
- Historia wpisów z filtrami dat, budowy i klienta.
- Raporty PL/NL z eksportem PDF, CSV i drukiem.
- Dyktowanie opisu, jeśli przeglądarka wspiera Web Speech API.
- PWA z manifestem, ikoną i service workerem.

## Konfiguracja lokalna

1. Zainstaluj zależności:

```bash
npm install
```

2. Skopiuj `.env.example` do `.env.local` i uzupełnij wartości z Firebase:

```bash
cp .env.example .env.local
```

Wymagane pola:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Opcjonalne tłumaczenie:

- `TRANSLATION_API_URL` - backendowy endpoint zgodny np. z LibreTranslate.
- `TRANSLATION_API_KEY` - klucz API, jeśli dostawca go wymaga.

3. Uruchom aplikację:

```bash
npm run dev
```

## Firebase Authentication

1. W Firebase Console utwórz projekt.
2. Włącz Authentication.
3. Włącz metodę Email/Password.
4. Nie włączaj publicznej rejestracji w aplikacji. Użytkowników twórz ręcznie w Firebase Console: Authentication -> Users -> Add user.
5. Po pierwszym logowaniu aplikacja utworzy dokument `users/{uid}` z podstawowym profilem użytkownika.

## Firestore

Wdróż reguły i indeksy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Model danych:

- `users/{userId}` - profil użytkownika.
- `projects/{projectId}` - budowy/projekty.
- `logs/{logId}` - wpisy czasu pracy.
- `activeTimers/{userId}` - aktywny timer użytkownika.

Reguły w `firestore.rules` blokują niezalogowanych użytkowników. Wpisy i timery są ograniczone do właściciela `userId`.

## PWA

Manifest znajduje się w `public/manifest.webmanifest`, ikona w `public/icon.svg`, a service worker w `public/sw.js`. Service worker rejestruje się w produkcji. Po wdrożeniu na HTTPS aplikację można dodać do ekranu głównego telefonu.

## Wdrożenie na Vercel

1. Utwórz projekt w Vercel z tego repozytorium.
2. Dodaj wszystkie zmienne z `.env.local` w Settings -> Environment Variables.
3. Wdróż aplikację.
4. W Firebase Console dodaj domenę Vercel do Authentication -> Settings -> Authorized domains.
5. Zweryfikuj logowanie, zapis budowy, wpisu, timer oraz eksport raportu.

## Kontrola jakości

Przed wdrożeniem uruchom:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm audit --omit=dev` może zgłaszać podatność przechodnią `next -> postcss` w Next 15. Według npm naprawa wymaga major upgrade do Next 16 (`npm audit fix --force`), więc należy wykonać ją jako osobną, świadomą migrację i ponownie przetestować aplikację.

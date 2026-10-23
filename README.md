# Remmark – dziennik pracy

Prosta aplikacja webowa (PWA) do codziennego zapisywania pracy na budowach: gdzie, od której do której, ile przerwy i co było robione. Do tego raporty za dowolny okres (PDF, Excel, druk) i statystyki.

Stack: Next.js 15, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, pdfmake.

## Co umie

- **Dziś** – „Zaczynam pracę” od razu włącza licznik, bez wybierania budowy. W trakcie: „+ Gdzie jesteś?”, „Zmieniam miejsce” (poprzednie miejsce kończy się w tej chwili), „Przerwa / Wracam”. Po „Kończę” cały dzień pokazuje się do sprawdzenia – miejsca, godziny, przerwa, opisy – i zapisuje się jednym przyciskiem. Licznik działa po zamknięciu aplikacji i na innym urządzeniu.
- **Wpisz dzień** – kilka miejsc w jednym dniu: dla każdego „Gdzie?” (wpisujesz nazwę, pojawiają się pasujące podpowiedzi, nowa nazwa sama dopisze się do budów), godziny od–do i opis. „+ Dodaj kolejne miejsce” zaczyna od końca poprzedniego. Przerwa za cały dzień jednym dotknięciem. Pilnuje, żeby godziny się nie nakładały, pokazuje czas między miejscami (dojazd, nie liczy się). Otwarcie dnia, który już jest zapisany, pozwala go poprawić albo dopisać miejsca.
- **Historia** – miesiąc po miesiącu, pogrupowane na dni z sumą dnia, filtr budowy. Dotknięcie wpisu otwiera cały dzień do edycji.
- **Raporty** – ten/poprzedni tydzień, ten/poprzedni miesiąc, rok, własne daty, filtr budowy. Podsumowanie (godziny, dni pracy, średnio dziennie, przerwy, typowe godziny, najdłuższy dzień), wykres dzień po dniu lub miesiąc po miesiącu, podział na budowy, lista wpisów. Eksport: PDF (PL lub NL, z polskimi znakami), CSV dla Excela, druk.
- **Budowy** – lista z wyszukiwaniem, statusy (w toku / wstrzymana / zakończona), szczegóły budowy z sumą godzin i jej raportem.
- **Konto** – imię i nazwisko (na raportach), zmiana hasła, wylogowanie.

## Model danych (Firestore)

- `users/{userId}` – profil (`name` pojawia się na raportach).
- `projects/{projectId}` – budowy.
- `logs/{logId}` – jeden wpis = jedno miejsce w danym dniu: `dateKey`, `projectId`, `startTime`, `endTime`, `breakMinutes`, `durationMinutes` (**netto, bez przerwy**), opisy. Dzień z trzema miejscami to trzy wpisy z tym samym `dateKey`.
- `activeTimers/{userId}` – trwający licznik: lista odcinków `segments` (miejsce, od kiedy, przerwy) i ewentualnie trwająca przerwa.

Starsze wpisy bez `breakMinutes` są traktowane jako wpisy bez przerwy – nic nie trzeba migrować.

## Uruchomienie lokalne

```bash
npm install
cp .env.example .env.local   # uzupełnij dane z Firebase
npm run dev                  # http://localhost:3001
```

## Firebase – po tej wersji trzeba raz wdrożyć indeksy

Doszedł nowy indeks (wpisy danej budowy). Wdróż reguły i indeksy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Użytkowników dodajesz ręcznie: Firebase Console → Authentication → Users → Add user (aplikacja nie ma publicznej rejestracji).

## Tłumaczenie PL → NL (opcjonalne)

Ustaw w `.env.local` / na Vercel `TRANSLATION_PROVIDER=deepl`, `TRANSLATION_API_URL`, `TRANSLATION_API_KEY` (szczegóły w `.env.example`). Bez tego przycisk tłumaczenia pokaże komunikat, reszta działa normalnie.

## Wdrożenie (Vercel)

1. Dodaj zmienne z `.env.local` w Settings → Environment Variables.
2. Deploy.
3. Domenę Vercel dodaj w Firebase → Authentication → Settings → Authorized domains.

Na telefonie: otwórz stronę i dodaj do ekranu głównego (iPhone: Udostępnij → Do ekranu początkowego; Android: menu → Dodaj do ekranu głównego).

## Kontrola jakości

```bash
npm run typecheck
npm run lint
npm run build
```

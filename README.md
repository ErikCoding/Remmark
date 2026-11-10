# Remmark – dziennik pracy

Prosta aplikacja webowa (PWA) do codziennego zapisywania pracy na budowach: gdzie, od której do której, ile przerwy i co było robione. Do tego raporty za dowolny okres (PDF, Excel, druk) i statystyki.

Stack: Next.js 15, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore, pdfmake.

## Co umie

- **Dziś** – „Zaczynam pracę” albo „Zaczynam od jazdy: Płatna / Bezpłatna” od razu włącza licznik, bez wybierania budowy. W trakcie: „+ Gdzie jesteś?”, **„Jazda”** (kończy bieżące miejsce w tej chwili i liczy jazdę – wlicza się do czasu pracy), w trakcie jazdy przełącznik „Liczy się / Nie liczy się” (jazda bezpłatna zatrzymuje zegar i nie trafia do raportów, w historii widać ją jako „Jazda bezpłatna”), **„Dojechałem – podaj miejsce”** (wymaga nazwy miejsca, od tej chwili liczy się czas na nim), „Inne miejsce” (zmiana bez jazdy), „Przerwa / Wracam”. Po „Kończę” cały dzień pokazuje się do sprawdzenia – miejsca, jazdy, godziny, przerwa, opisy – i zapisuje się jednym przyciskiem. Licznik działa po zamknięciu aplikacji i na innym urządzeniu.
- **Wpisz dzień** – kilka miejsc w jednym dniu: dla każdego „Gdzie?” (wpisujesz nazwę, pojawiają się pasujące podpowiedzi, nowa nazwa sama dopisze się do budów), godziny od–do i opis. „Dodaj miejsce” / „Dodaj jazdę” zaczynają od końca poprzedniego odcinka, a lukę między miejscami można jednym dotknięciem oznaczyć „To była jazda”. Przerwa za cały dzień jednym dotknięciem. Pilnuje, żeby godziny się nie nakładały, pokazuje czas między odcinkami bez wpisu (nie liczy się). Otwarcie dnia, który już jest zapisany, pozwala go poprawić albo dopisać miejsca.
- **Historia** – miesiąc po miesiącu, pogrupowane na dni z sumą dnia, filtr budowy. Dotknięcie wpisu otwiera cały dzień do edycji.
- **Raporty** – ten/poprzedni tydzień, ten/poprzedni miesiąc, rok, własne daty, filtr budowy. Podsumowanie (godziny, dni pracy, średnio dziennie, przerwy, typowe godziny, najdłuższy dzień), wykres dzień po dniu lub miesiąc po miesiącu, podział na budowy, lista wpisów. Eksport: PDF, CSV dla Excela, druk.
  - **„Co ma być w raporcie”** – podsumowanie, podział na budowy, lista wpisów, miejsce na podpisy; w liście: godziny od–do, przerwy, opis, notatki, suma każdego dnia; do tego jazda i klienci. Wybór zapamiętuje się na telefonie i dotyczy też pliku do Excela.
  - **Nederlands** – cały raport po niderlandzku: nagłówki, daty i dni tygodnia, a także nazwy budów, opisy i notatki (tłumaczone przez DeepL; ręcznie wpisany opis NL ma pierwszeństwo). Tłumaczenia są zapamiętywane w przeglądarce, więc ten sam tekst nie zużywa limitu drugi raz. „Przetłumacz od nowa” czyści tę pamięć.
- **Budowy** – lista z wyszukiwaniem, statusy (w toku / wstrzymana / zakończona), szczegóły budowy z sumą godzin i jej raportem.
- **Konto** – imię i nazwisko (na raportach), zmiana hasła, wylogowanie.

## Model danych (Firestore)

- `users/{userId}` – profil (`name` pojawia się na raportach).
- `projects/{projectId}` – budowy.
- `logs/{logId}` – jeden wpis = jedno miejsce albo jedna jazda w danym dniu (`kind`: `work` / `travel`, `unpaid: true` = jazda bezpłatna z `durationMinutes: 0`, pomijana w raportach; jazda ma pusty `projectId`, w raportach jako „Jazda”, filtr „Tylko jazda”): `dateKey`, `projectId`, `startTime`, `endTime`, `breakMinutes`, `durationMinutes` (**netto, bez przerwy**), opisy. Dzień z trzema miejscami to trzy wpisy z tym samym `dateKey`.
- `activeTimers/{userId}` – trwający licznik: lista odcinków `segments` (rodzaj praca/jazda, miejsce, od kiedy, przerwy) i ewentualnie trwająca przerwa.

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

## Tłumaczenie PL → NL (DeepL)

1. Konto DeepL API Free (500 000 znaków miesięcznie za darmo): https://www.deepl.com/pro-api → klucz w „Account → API Keys”.
2. W `.env.local` (lokalnie) i w Vercel → Settings → Environment Variables (Production i Preview):
   ```
   TRANSLATION_PROVIDER=deepl
   TRANSLATION_API_URL=https://api-free.deepl.com/v2/translate
   TRANSLATION_API_KEY=…:fx
   ```
   Płatny klucz (bez „:fx”) → adres `https://api.deepl.com/v2/translate`.
3. Po zmianie zmiennych na Vercel trzeba zrobić **Redeploy** – bez tego serwer ich nie widzi.
4. Sprawdzenie: Raporty → „Nederlands”. Zielone „Nazwy budów i opisy przetłumaczone” = działa. Czerwony komunikat mówi, co jest nie tak (zły klucz, zły adres, wyczerpany limit, brak konfiguracji).

Bez tej konfiguracji reszta aplikacji działa normalnie, a raport NL ma przetłumaczone tylko nagłówki.

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

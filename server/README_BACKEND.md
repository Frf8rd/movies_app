# ReelMatch — Backend (Django + DRF + Neon PostgreSQL)

Implementează tot ce e în README-ul proiectului (secțiunile 7–11): conturi + JWT, mod invitat, catalog TMDB (cache în DB),
camere, vot privat, matching, liste, watchlist, istoric, statistici. Swagger: **`/api/docs/`**.

## Pornire rapidă
```bash
cd server
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                      # completează DATABASE_URL (Neon) și TMDB_API_KEY
python manage.py migrate
python manage.py seed_demo                                # filme fictive, ca să testați fără TMDB
# SAU, cu cheia TMDB:
python manage.py sync_movies --genres --providers --country RO --pages 20
python manage.py createsuperuser                          # panou /admin
python manage.py runserver 0.0.0.0:8000
```
Neon: Dashboard → *Connect* → copiezi connection string-ul în `DATABASE_URL` (cu `?sslmode=require`).
În producție folosește adresa *pooled* (`-pooler` în host). Prima cerere după inactivitate poate dura 1–2 s (normal).

## Teste
```bash
python manage.py test --settings=reelmatch.settings.test   # SQLite în memorie, rapid
python manage.py test                                      # pe baza din DATABASE_URL (necesită drept CREATEDB)
```

## Ce trebuie să știe cel care face frontend-ul
- **Toate câmpurile JSON sunt camelCase** (`movieId`, `genreIds`, `guestToken`…), query params la fel (`maxRuntime`, `yearFrom`).
- **Format de eroare unic:** `{ "error": { "code": "ALREADY_VOTED", "message": "…", "details": {…}? } }`.
  Coduri utile: `EMAIL_EXISTS`, `INVALID_CREDENTIALS`, `ROOM_NOT_FOUND`, `NICKNAME_REQUIRED`, `NICKNAME_TAKEN`, `ROOM_STARTED`,
  `ROOM_FULL`, `DECK_TOO_SMALL` (422), `ALREADY_VOTED`, `VETO_USED`, `NOT_VOTING`, `RESULTS_NOT_READY` (403), `TOO_MANY_REQUESTS` (429).
- **Refresh token cu rotație:** `POST /auth/refresh` întoarce `{ access, refresh }` — salvează noul `refresh`, cel vechi devine invalid.
  `POST /auth/change-password` întoarce tokenuri noi.
- **Invitat:** `POST /rooms/join {code, nickname}` fără header → `201 { room, member, guestToken }`. Trimite `Authorization: Bearer <guestToken>`.
  Invitatul poate folosi doar: `GET /movies/:id` și rutele `/rooms/:id/*` (detalii, leave, deck, votes, progress, results) ale camerei lui.
- **Fluxul camerei:** `LOBBY` → (`POST start`, doar gazda) → `VOTING` → (toți au terminat SAU `close-voting`) → `RESULTS` → (`pick`) → `CLOSED`.
  `GET /rooms/:id` și `GET /rooms/:id/progress` se pot face polling la 3–5 s; trec în `RESULTS` automat când termină toți.
- **Voturi:** `choice` ∈ `LIKE | DISLIKE | SUPER | VETO` (veto: o dată pe cameră). `deck` conține doar voturile *tale* (`voted`, `myChoice`).
- **Rezultate:** `{ hasUnanimous, unanimous[], closest[], pickedMovie }`; fiecare element: `movie, score, likes, supers, dislikes` (fără nume).
- Căutare filme: răspuns paginat `{ count, next, previous, results }`; restul listelor sunt array-uri simple.
- Limitare de cereri: `/auth/*` 20/min, `/rooms/join` 15/min (configurabil prin `THROTTLE_AUTH`, `THROTTLE_JOIN`) → `429`.

## Deploy (Render / Railway / Fly.io)
`Procfile` inclus (`migrate` + `gunicorn`). Variabile: `DJANGO_SETTINGS_MODULE=reelmatch.settings.prod`, `DJANGO_SECRET_KEY`,
`DJANGO_ALLOWED_HOSTS`, `DATABASE_URL` (pooled), `TMDB_API_KEY`, `CSRF_TRUSTED_ORIGINS`.
Apoi o dată: `python manage.py sync_movies --genres --providers --country RO --pages 20`.
GDPR: rulează zilnic `python manage.py purge_old_rooms` (șterge voturile mai vechi de `VOTE_RETENTION_DAYS`, implicit 90).

## Structură
`apps/accounts` (User, auth, preferințe) · `apps/movies` (catalog + client TMDB + `sync_movies`) · `apps/rooms` (camere, vot,
`services/matching.py`, `deck_builder.py`, auth invitat) · `apps/lists` · `apps/library` (watchlist, istoric, stats) · `apps/core` (erori, camelCase, health).

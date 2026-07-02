# booker

personal book‑tracking / reading‑list app, styled after MyAnimeList. python/fastapi backend + react frontend, book data from [open library](https://openlibrary.org).

thesis project.

## what it does

- browse genre feeds, live search, book pages with descriptions and covers
- personal library: statuses (reading / plan / completed / dropped / hold), page progress, rereads, private notes, custom books
- community ratings — the score on a card is the real average of what booker users rated that book
- "picked for you" feed based on the subjects of books in your library
- profile stats: pages read, reading time, status breakdown, books finished per month (start/finish dates are tracked automatically)
- library export to csv/json, account deletion, login rate limiting
- demo library for logged-out visitors, light/dark theme

## running it

backend:

```sh
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

frontend:

```sh
cd frontend
npm install
npm run dev     # http://localhost:5173
```

the vite dev server proxies `/api` to the backend, so both need to be running. api docs (swagger) are at http://127.0.0.1:8000/docs.

env (optional): `BOOKER_SECRET_KEY` for jwt signing, `BOOKER_DATABASE_URL` to move the sqlite file, `VITE_API_BASE` if the api lives somewhere else.

## deployment

one process serves everything — the built frontend plus the api under `/api`:

```sh
cd frontend && npm run build
cd ../backend && uvicorn main:server --host 0.0.0.0 --port 8000
```

or with docker:

```sh
docker compose up -d    # http://localhost:8000
docker compose down
```

the db lands in a named volume, so it survives rebuilds. set `BOOKER_SECRET_KEY` in the environment (or an `.env` file) for anything public.

## tests

```sh
cd backend && pip install -r requirements-dev.txt && python -m pytest tests/
cd frontend && npm test
```

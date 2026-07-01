# booker

personal book‑tracking / reading‑list app, styled after MyAnimeList. python/fastapi backend + react frontend, book data from [open library](https://openlibrary.org).

thesis project.

## what it does

- browse genre feeds, live search, book pages with descriptions and covers
- personal library: statuses (reading / plan / completed / dropped / hold), page progress, rereads, private notes, custom books
- community ratings — the score on a card is the real average of what booker users rated that book
- profile stats: pages read, reading time, status breakdown, books finished per month (start/finish dates are tracked automatically)
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

the vite dev server proxies `/api` to the backend, so both need to be running.

env (optional): `BOOKER_SECRET_KEY` for jwt signing, `BOOKER_DATABASE_URL` to move the sqlite file, `VITE_API_BASE` if the api lives somewhere else.

## tests

```sh
cd backend && pip install -r requirements-dev.txt && python -m pytest tests/
cd frontend && npm test
```

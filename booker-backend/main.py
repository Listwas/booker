from fastapi import FastAPI
from constants import DATABASE_URL
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/books/{genre}")
def get_books(genre: str, limit: int = 7):
    url = f"https://openlibrary.org/subjects/{genre}.json?limit={limit}"
    res = requests.get(url)
    data = res.json()

    books = []
    for work in data.get("works", []):
        cover_id = work.get("cover_id")
        if not cover_id:
            continue

        books.append({
            "title": work.get("title"),
            "author": work.get("authors", [{}])[0].get("name", "Unknown"),
            "cover": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"
        })

    return {"books": books}

# you can view someone's list but only owner can edit
@app.get("/booklist")
async def booklist():
    return {"message": "booklist"}

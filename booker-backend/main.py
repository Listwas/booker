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

@app.get("/books")
def get_books(query: str = "python"):
    res = requests.get("https://openlibrary.org/search.json?q=python")
    data = res.json()
    
    books = []
    for book in data["docs"][:2]:
        books.append({
            "title": book["title"],
            "author": ", ".join(book.get("author_name", []))
        })
    return books

# you can view someone's list but only owner can edit
@app.get("/booklist")
async def booklist():
    return {"message": "booklist"}

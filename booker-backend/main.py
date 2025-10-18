from fastapi import FastAPI
from constants import DATABASE_URL
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/books")
def get_books():
    return [
        {"title": "The Hobbit", "author": "J.R.R. Tolkien"},
        {"title": "Dune", "author": "Frank Herbert"},
        {"title": "1984", "author": "George Orwell"},
        {"title": "1984", "author": "George Orwell"}
    ]


# you can view someone's list but only owner can edit
@app.get("/booklist")
async def booklist():
    return {"message": "booklist"}

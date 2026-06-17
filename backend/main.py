from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
from cachetools import TTLCache

from database import SessionLocal, User, UserBook
from auth import hash_password, verify_password, create_token, decode_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

search_cache = TTLCache(maxsize=100, ttl=600)
genre_cache = TTLCache(maxsize=100, ttl=600)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RegisterBody(BaseModel):
    username: str
    email: str
    password: str


class BookEntry(BaseModel):
    title: str
    author: str
    cover: str
    status: str
    rating: float | None = None
    progress: int | None = None
    total_pages: int | None = None
    work_id: str | None = None


class BookUpdate(BaseModel):
    status: str | None = None
    rating: float | None = None
    progress: int | None = None
    total_pages: int | None = None
    work_id: str | None = None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email taken")
    user = User(username=body.username, email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "ok", "username": user.username}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": create_token(user.username), "token_type": "bearer"}


@app.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}


@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = db.query(UserBook).filter(UserBook.user_id == current_user.id).all()
    
    total_pages_read = 0
    for b in books:
        if b.status == "completed" and b.total_pages:
            total_pages_read += b.total_pages
        elif b.status == "reading" and b.progress:
            total_pages_read += b.progress
    
    pages_per_minute = 1
    total_minutes_read = total_pages_read // pages_per_minute if pages_per_minute > 0 else 0
    reading_time_hours = total_minutes_read // 60
    reading_time_days = reading_time_hours // 24
    
    stats = {
        "total": len(books),
        "reading": sum(1 for b in books if b.status == "reading"),
        "completed": sum(1 for b in books if b.status == "completed"),
        "plan": sum(1 for b in books if b.status == "plan"),
        "dropped": sum(1 for b in books if b.status == "dropped"),
        "hold": sum(1 for b in books if b.status == "hold"),
        "total_pages_read": total_pages_read,
        "reading_time_hours": reading_time_hours,
        "reading_time_days": reading_time_days,
    }
    return {"username": current_user.username, "email": current_user.email, "stats": stats}

    
@app.get("/list")
def get_list(status: str = "all", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(UserBook).filter(UserBook.user_id == current_user.id)
    if status != "all":
        q = q.filter(UserBook.status == status)
    return q.all()


@app.get("/list/ids")
def get_list_ids(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = db.query(UserBook).filter(UserBook.user_id == current_user.id).all()
    return {
        "work_ids": [b.work_id for b in books],
        "titles": [b.title for b in books],
        "authors": [b.author for b in books],
    }


@app.post("/list")
def add_book(body: BookEntry, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = None
    if body.work_id:
        existing = db.query(UserBook).filter(
            UserBook.user_id == current_user.id,
            UserBook.work_id == body.work_id
        ).first()
    if not existing and not body.work_id:
        existing = db.query(UserBook).filter(
            UserBook.user_id == current_user.id,
            UserBook.title == body.title,
            UserBook.author == body.author
        ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book already in your list")
    
    entry = UserBook(user_id=current_user.id, **body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "title": entry.title,
        "author": entry.author,
        "cover": entry.cover,
        "status": entry.status,
        "rating": entry.rating,
        "progress": entry.progress,
        "total_pages": entry.total_pages,
        "rereads": entry.rereads,
        "work_id": entry.work_id
    }

@app.patch("/list/{book_id}")
def update_book(book_id: int, body: BookUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    if body.status is not None:
        entry.status = body.status
    if body.rating is not None:
        entry.rating = body.rating
    if body.progress is not None:
        if entry.total_pages is not None and body.progress > entry.total_pages:
            raise HTTPException(status_code=400, detail="Progress cannot exceed total pages")
        entry.progress = body.progress
    if body.total_pages is not None:
        entry.total_pages = body.total_pages
        if entry.progress is not None and entry.progress > entry.total_pages:
            entry.progress = entry.total_pages
    if body.work_id is not None:
        entry.work_id = body.work_id
    db.commit()
    db.refresh(entry)
    
    return {
        "id": entry.id,
        "user_id": entry.user_id,
        "title": entry.title,
        "author": entry.author,
        "cover": entry.cover,
        "status": entry.status,
        "rating": entry.rating,
        "progress": entry.progress,
        "total_pages": entry.total_pages,
        "rereads": entry.rereads,
        "work_id": entry.work_id
    }

@app.delete("/list/{book_id}")
def remove_book(book_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"message": "deleted"}


@app.post("/list/{book_id}/reread")
def reread_book(book_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.rereads += 1
    entry.progress = 0
    entry.status = "reading"
    db.commit()
    return {"message": "reread count incremented", "rereads": entry.rereads}


@app.post("/seed")
def seed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(UserBook).filter(UserBook.user_id == current_user.id).delete()
    mock = [
        {"title": "The Name of the Wind", "author": "Patrick Rothfuss", "cover": "https://covers.openlibrary.org/b/id/9326654-M.jpg", "status": "completed", "rating": 9.1, "progress": 662, "total_pages": 662, "rereads": 0, "work_id": "OL17354253W"},
        {"title": "The Way of Kings", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8146092-M.jpg", "status": "completed", "rating": 9.4, "progress": 1007, "total_pages": 1007, "rereads": 1, "work_id": "OL15646042W"},
        {"title": "Dune", "author": "Frank Herbert", "cover": "https://covers.openlibrary.org/b/id/8760472-M.jpg", "status": "reading", "rating": None, "progress": 312, "total_pages": 896, "rereads": 0, "work_id": "OL893415W"},
        {"title": "Neuromancer", "author": "William Gibson", "cover": "https://covers.openlibrary.org/b/id/8775481-M.jpg", "status": "plan", "rating": None, "progress": 0, "total_pages": 271, "rereads": 0, "work_id": "OL834643W"},
        {"title": "Blood Meridian", "author": "Cormac McCarthy", "cover": "https://covers.openlibrary.org/b/id/8231856-M.jpg", "status": "dropped", "rating": 6.0, "progress": 140, "total_pages": 351, "rereads": 0, "work_id": "OL98567W"},
        {"title": "Foundation", "author": "Isaac Asimov", "cover": "https://covers.openlibrary.org/b/id/8398800-M.jpg", "status": "hold", "rating": None, "progress": 80, "total_pages": 255, "rereads": 0, "work_id": "OL46534W"},
        {"title": "Mistborn", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8391784-M.jpg", "status": "completed", "rating": 8.7, "progress": 541, "total_pages": 541, "rereads": 0, "work_id": "OL57218W"},
        {"title": "Hyperion", "author": "Dan Simmons", "cover": "https://covers.openlibrary.org/b/id/360716-M.jpg", "status": "plan", "rating": None, "progress": 0, "total_pages": 482, "rereads": 0, "work_id": "OL160426W"},
    ]
    for m in mock:
        db.add(UserBook(user_id=current_user.id, **m))
    db.commit()
    return {"message": f"seeded {len(mock)} books"}


@app.get("/books/{genre}")
def get_books(genre: str, limit: int = 20):
    cache_key = f"{genre}_{limit}"
    if cache_key in genre_cache:
        return genre_cache[cache_key]

    url = f"https://openlibrary.org/subjects/{genre}.json?limit={limit}"
    data = requests.get(url).json()
    books = []
    for w in data.get("works", []):
        cid = w.get("cover_id")
        if not cid:
            continue
        work_id = w.get("key", "").replace("/works/", "")
        books.append({
            "title": w.get("title"),
            "author": w.get("authors", [{}])[0].get("name") if w.get("authors") else "Unknown",
            "cover": f"https://covers.openlibrary.org/b/id/{cid}-M.jpg",
            "work_id": work_id
        })
    result = {"books": books}
    genre_cache[cache_key] = result
    return result


@app.get("/search")
def search_books(q: str, limit: int = 20):
    cache_key = f"{q}_{limit}"
    if cache_key in search_cache:
        return search_cache[cache_key]

    url = f"https://openlibrary.org/search.json?q={q}&limit={limit}&fields=title,author_name,cover_i,key"
    data = requests.get(url).json()
    books = []
    for doc in data.get("docs", []):
        cid = doc.get("cover_i")
        if not cid:
            continue
        work_id = doc.get("key", "").replace("/works/", "")
        books.append({
            "title": doc.get("title"),
            "author": doc.get("author_name", ["Unknown"])[0],
            "cover": f"https://covers.openlibrary.org/b/id/{cid}-M.jpg",
            "work_id": work_id
        })
    result = {"books": books}
    search_cache[cache_key] = result
    return result


@app.get("/book/{work_id}")
def get_book(work_id: str):
    url = f"https://openlibrary.org/works/{work_id}.json"
    data = requests.get(url).json()

    description = data.get("description", "")
    if isinstance(description, dict):
        description = description.get("value", "")

    subjects = data.get("subjects", [])[:6]

    authors = []
    for a in data.get("authors", []):
        author_key = a.get("author", {}).get("key", "")
        if author_key:
            author_data = requests.get(f"https://openlibrary.org{author_key}.json").json()
            authors.append(author_data.get("name", "Unknown"))

    covers = data.get("covers", [])
    cover = f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg" if covers else ""

    return {
        "title": data.get("title", ""),
        "authors": authors,
        "cover": cover,
        "description": description,
        "subjects": subjects,
        "first_publish_year": data.get("first_publish_date", ""),
        "work_id": work_id
    }

@app.get("/book/{work_id}/metadata")
def get_book_metadata(work_id: str):
    cache_key = f"metadata_{work_id}"
    if cache_key in genre_cache:
        return genre_cache[cache_key]
    
    url = f"https://openlibrary.org/works/{work_id}.json"
    data = requests.get(url).json()
    
    pages = data.get("number_of_pages")
    
    result = {"total_pages": pages}
    genre_cache[cache_key] = result
    return result
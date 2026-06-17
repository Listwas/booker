from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
import requests
from cachetools import TTLCache
import threading

from database import SessionLocal, User, UserBook
from auth import hash_password, verify_password, create_token, decode_token
from community import community_rating
from demo_data import DEMO_BOOKS, demo_profile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

search_cache = TTLCache(maxsize=200, ttl=600)
genre_cache = TTLCache(maxsize=200, ttl=1800)
book_cache = TTLCache(maxsize=200, ttl=3600)
meta_cache = TTLCache(maxsize=400, ttl=3600)
_cache_lock = threading.Lock()


def _cached_get(key, cache, url):
    with _cache_lock:
        if key in cache:
            return cache[key]
    data = requests.get(url, timeout=15).json()
    with _cache_lock:
        cache[key] = data
    return data


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RegisterBody(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    email: EmailStr
    password: str = Field(min_length=6)

    @field_validator("username")
    @classmethod
    def username_chars(cls, v):
        if not v.replace("_", "").isalnum():
            raise ValueError("Username can only contain letters, numbers and underscores")
        return v


class BookEntry(BaseModel):
    title: str
    author: str
    cover: str = ""
    status: str = "plan"
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


def serialize_book(b):
    return {
        "id": b.id,
        "user_id": b.user_id,
        "title": b.title,
        "author": b.author,
        "cover": b.cover,
        "status": b.status,
        "rating": b.rating,
        "progress": b.progress,
        "total_pages": b.total_pages,
        "rereads": b.rereads,
        "work_id": b.work_id,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def calc_pages_read(books):
    # count full reads (rereads) + current progress
    total = 0
    for b in books:
        base = 0
        if b.status == "completed" and b.total_pages:
            base = b.total_pages
        elif b.progress:
            base = b.progress
        total += base + (b.rereads or 0) * (b.total_pages or 0)
    return total


@app.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "ok", "username": user.username, "email": user.email}


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

    total_pages_read = calc_pages_read(books)
    total_minutes = total_pages_read
    reading_time_hours = total_minutes // 60
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
    q = q.order_by(UserBook.created_at.desc())
    return [serialize_book(b) for b in q.all()]


@app.get("/list/ids")
def get_list_ids(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = db.query(UserBook).filter(UserBook.user_id == current_user.id).all()
    return {
        "work_ids": [b.work_id for b in books],
        "titles": [b.title for b in books],
        "authors": [b.author for b in books],
    }


def _fetch_pages_background(book_id, work_id):
    try:
        meta = get_book_metadata(work_id)
        if meta.get("total_pages"):
            db = SessionLocal()
            try:
                entry = db.query(UserBook).filter(UserBook.id == book_id).first()
                if entry and entry.total_pages is None:
                    entry.total_pages = meta["total_pages"]
                    entry.updated_at = datetime.utcnow()
                    db.commit()
            finally:
                db.close()
    except Exception:
        pass


@app.post("/list")
def add_book(
    body: BookEntry,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = None
    if body.work_id:
        existing = db.query(UserBook).filter(
            UserBook.user_id == current_user.id,
            UserBook.work_id == body.work_id,
        ).first()
    if not existing and not body.work_id:
        existing = db.query(UserBook).filter(
            UserBook.user_id == current_user.id,
            UserBook.title == body.title,
            UserBook.author == body.author,
        ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book already in your list")

    entry = UserBook(
        user_id=current_user.id,
        title=body.title,
        author=body.author,
        cover=body.cover,
        status=body.status,
        rating=body.rating,
        progress=body.progress,
        total_pages=body.total_pages,
        work_id=body.work_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    if body.work_id and body.total_pages is None:
        background_tasks.add_task(_fetch_pages_background, entry.id, body.work_id)

    return serialize_book(entry)


@app.patch("/list/{book_id}")
def update_book(book_id: int, body: BookUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")

    if body.status is not None:
        entry.status = body.status
        if body.status == "completed" and entry.total_pages:
            entry.progress = entry.total_pages
    if body.rating is not None:
        entry.rating = body.rating
    if body.progress is not None:
        if entry.total_pages is not None and body.progress > entry.total_pages:
            raise HTTPException(status_code=400, detail="Progress cannot exceed total pages")
        entry.progress = body.progress
    if body.total_pages is not None:
        entry.total_pages = body.total_pages
        if entry.progress is not None and entry.progress > body.total_pages:
            entry.progress = body.total_pages
    if body.work_id is not None:
        entry.work_id = body.work_id
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry)


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
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry)


@app.post("/list/{book_id}/reset-reread")
def reset_reread(book_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.rereads = 0
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry)


@app.get("/books/{genre}")
def get_books(genre: str, limit: int = 20):
    cache_key = f"genre_{genre}_{limit}"
    url = f"https://openlibrary.org/subjects/{genre}.json?limit={limit}"
    data = _cached_get(cache_key, genre_cache, url)
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
            "work_id": work_id,
            "community": community_rating(work_id),
        })
    return {"books": books}


@app.get("/search")
def search_books(q: str, limit: int = 20):
    cache_key = f"search_{q.lower()}_{limit}"
    url = f"https://openlibrary.org/search.json?q={q}&limit={limit}&fields=title,author_name,cover_i,key"
    data = _cached_get(cache_key, search_cache, url)
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
            "work_id": work_id,
            "community": community_rating(work_id),
        })
    return {"books": books}


@app.get("/book/{work_id}")
def get_book(work_id: str):
    cache_key = f"book_{work_id}"
    url = f"https://openlibrary.org/works/{work_id}.json"
    data = _cached_get(cache_key, book_cache, url)

    description = data.get("description", "")
    if isinstance(description, dict):
        description = description.get("value", "")

    subjects = data.get("subjects", [])[:6]

    authors = []
    for a in data.get("authors", []):
        author_key = a.get("author", {}).get("key", "")
        if author_key:
            author_data = _cached_get(
                f"author_{author_key}", book_cache, f"https://openlibrary.org{author_key}.json"
            )
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
        "work_id": work_id,
        "community": community_rating(work_id),
    }


@app.get("/book/{work_id}/metadata")
def get_book_metadata(work_id: str):
    cache_key = f"meta_{work_id}"
    with _cache_lock:
        if cache_key in meta_cache:
            return meta_cache[cache_key]

    pages = None
    try:
        ed = requests.get(
            f"https://openlibrary.org/works/{work_id}/editions.json?limit=20",
            timeout=15,
        ).json()
        for entry in ed.get("entries", []):
            p = entry.get("number_of_pages")
            if isinstance(p, int) and p > 0:
                pages = p
                break
    except Exception:
        pass

    if not pages:
        try:
            data = _cached_get(f"book_{work_id}", book_cache, f"https://openlibrary.org/works/{work_id}.json")
            p = data.get("number_of_pages")
            if isinstance(p, int) and p > 0:
                pages = p
        except Exception:
            pass

    result = {"total_pages": pages}
    with _cache_lock:
        meta_cache[cache_key] = result
    return result


@app.post("/seed")
def seed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(UserBook).filter(UserBook.user_id == current_user.id).delete()
    for m in DEMO_BOOKS:
        db.add(UserBook(user_id=current_user.id, **m))
    db.commit()
    return {"message": f"seeded {len(DEMO_BOOKS)} books"}


@app.get("/demo")
def demo():
    return {"profile": demo_profile(), "books": DEMO_BOOKS}
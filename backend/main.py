import csv
import io
import re
import time
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
import requests
from cachetools import TTLCache
import threading

from database import SessionLocal, User, UserBook, utcnow
from auth import hash_password, verify_password, create_token, decode_token
from community import community_rating, community_ratings
from demo_data import DEMO_BOOKS, demo_profile

app = FastAPI()

# only matters when the frontend skips the vite /api proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

search_cache = TTLCache(maxsize=200, ttl=600)
genre_cache = TTLCache(maxsize=200, ttl=1800)
book_cache = TTLCache(maxsize=200, ttl=3600)
meta_cache = TTLCache(maxsize=400, ttl=3600)
rec_cache = TTLCache(maxsize=200, ttl=1800)
translation_cache = TTLCache(maxsize=300, ttl=24 * 3600)
_cache_lock = threading.Lock()


def _cached_get(key, cache, url, params=None):
    with _cache_lock:
        if key in cache:
            return cache[key]
    data = requests.get(url, params=params, timeout=15).json()
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
    title: str = Field(min_length=1, max_length=300)
    author: str = Field(min_length=1, max_length=200)
    cover: str = ""
    status: str = "plan"
    rating: float | None = Field(default=None, ge=0, le=5)
    progress: int | None = Field(default=None, ge=0)
    total_pages: int | None = Field(default=None, ge=1)
    work_id: str | None = None


class BookUpdate(BaseModel):
    status: str | None = None
    rating: float | None = Field(default=None, ge=0, le=5)
    progress: int | None = Field(default=None, ge=0)
    total_pages: int | None = Field(default=None, ge=1)
    work_id: str | None = None
    note: str | None = Field(default=None, max_length=2000)
    clear_rating: bool = False


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def serialize_book(b, community=None):
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
        "note": b.note,
        "started_at": b.started_at.isoformat() if b.started_at else None,
        "finished_at": b.finished_at.isoformat() if b.finished_at else None,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        "community": community,
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


def monthly_stats(books, months=6):
    # completed books + pages bucketed per month, oldest first
    y, m = utcnow().year, utcnow().month
    keys = []
    for _ in range(months):
        keys.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    keys.reverse()

    buckets = {k: {"books": 0, "pages": 0} for k in keys}
    for b in books:
        if b.status == "completed" and b.finished_at:
            k = (b.finished_at.year, b.finished_at.month)
            if k in buckets:
                buckets[k]["books"] += 1
                buckets[k]["pages"] += b.total_pages or 0
    return [{"month": f"{y}-{m:02d}", **buckets[(y, m)]} for y, m in keys]


def apply_status_dates(entry, new_status):
    # track when a book was actually started / finished
    if new_status == "reading" and entry.started_at is None:
        entry.started_at = utcnow()
    if new_status == "completed":
        if entry.started_at is None:
            entry.started_at = utcnow()
        if entry.finished_at is None:
            entry.finished_at = utcnow()
    elif entry.status == "completed":
        # left completed, finish date no longer applies
        entry.finished_at = None


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


# failed logins per username
login_attempts: dict[str, list[float]] = {}
_attempts_lock = threading.Lock()
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW = 15 * 60


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    key = form.username.lower()
    now = time.time()
    with _attempts_lock:
        recent = [t for t in login_attempts.get(key, []) if now - t < LOGIN_WINDOW]
        login_attempts[key] = recent
        if len(recent) >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many failed logins, try again later")

    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        with _attempts_lock:
            login_attempts.setdefault(key, []).append(now)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    with _attempts_lock:
        login_attempts.pop(key, None)
    return {"access_token": create_token(user.username), "token_type": "bearer"}


@app.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "avatar": current_user.avatar,
        "banner": current_user.banner,
    }


class ImageBody(BaseModel):
    # client resizes before upload, the cap is just a backstop
    image: str | None = Field(default=None, max_length=800_000)

    @field_validator("image")
    @classmethod
    def must_be_image(cls, v):
        if v is not None and not v.startswith("data:image/"):
            raise ValueError("not an image data url")
        return v


@app.post("/me/avatar")
def set_avatar(body: ImageBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.avatar = body.image
    db.commit()
    return {"avatar": current_user.avatar}


@app.post("/me/banner")
def set_banner(body: ImageBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.banner = body.image
    db.commit()
    return {"banner": current_user.banner}


class PasswordChangeBody(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


@app.post("/me/password")
def change_password(body: PasswordChangeBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Wrong password")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "password changed"}


class DeleteAccountBody(BaseModel):
    password: str


@app.post("/me/delete")
def delete_account(body: DeleteAccountBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Wrong password")
    db.query(UserBook).filter(UserBook.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "account deleted"}


EXPORT_FIELDS = [
    "title", "author", "status", "rating", "progress", "total_pages",
    "rereads", "work_id", "note", "started_at", "finished_at", "created_at",
]


@app.get("/export")
def export_library(format: str = "json", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = (
        db.query(UserBook)
        .filter(UserBook.user_id == current_user.id)
        .order_by(UserBook.created_at.desc())
        .all()
    )
    rows = [{f: serialize_book(b)[f] for f in EXPORT_FIELDS} for b in books]

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=EXPORT_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
        return Response(
            buf.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="booker-library.csv"'},
        )
    return JSONResponse(
        rows,
        headers={"Content-Disposition": 'attachment; filename="booker-library.json"'},
    )


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
    return {
        "username": current_user.username,
        "email": current_user.email,
        "avatar": current_user.avatar,
        "banner": current_user.banner,
        "stats": stats,
        "monthly": monthly_stats(books),
    }


@app.get("/list")
def get_list(status: str = "all", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(UserBook).filter(UserBook.user_id == current_user.id)
    if status != "all":
        q = q.filter(UserBook.status == status)
    books = q.order_by(UserBook.created_at.desc()).all()
    ratings = community_ratings(db, [b.work_id for b in books])
    return [serialize_book(b, ratings.get(b.work_id)) for b in books]


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
                    entry.updated_at = utcnow()
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
    apply_status_dates(entry, body.status)
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # fetch page count in background so the response returns instantly
    if body.work_id and body.total_pages is None:
        background_tasks.add_task(_fetch_pages_background, entry.id, body.work_id)

    return serialize_book(entry)


@app.patch("/list/{book_id}")
def update_book(book_id: int, body: BookUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")

    if body.status is not None:
        apply_status_dates(entry, body.status)
        entry.status = body.status
        if body.status == "completed" and entry.total_pages:
            entry.progress = entry.total_pages
    if body.clear_rating:
        entry.rating = None
    elif body.rating is not None:
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
    if body.note is not None:
        entry.note = body.note.strip() or None
    entry.updated_at = utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry, community_rating(db, entry.work_id))


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
    entry.started_at = utcnow()
    entry.finished_at = None
    entry.updated_at = utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry)


@app.post("/list/{book_id}/reset-reread")
def reset_reread(book_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.rereads = 0
    entry.updated_at = utcnow()
    db.commit()
    db.refresh(entry)
    return serialize_book(entry)


SEARCH_FIELDS = "title,author_name,cover_i,key,ratings_average,ratings_count"


def openlibrary_rating(avg, count):
    # fallback when no booker user rated a book
    if avg and count:
        return {"rating": round(avg, 1), "count": count, "source": "openlibrary"}
    return {"rating": None, "count": 0, "source": None}


def docs_to_books(docs, db):
    docs = [d for d in docs if d.get("cover_i")]
    work_ids = [d.get("key", "").replace("/works/", "") for d in docs]
    ratings = community_ratings(db, work_ids)
    return [
        {
            "title": d.get("title"),
            "author": (d.get("author_name") or ["Unknown"])[0],
            "cover": f"https://covers.openlibrary.org/b/id/{d['cover_i']}-M.jpg",
            "work_id": work_id,
            "community": ratings.get(work_id)
                or openlibrary_rating(d.get("ratings_average"), d.get("ratings_count")),
        }
        for d, work_id in zip(docs, work_ids)
    ]


@app.get("/books/{genre}")
def get_books(genre: str, limit: int = 20, db: Session = Depends(get_db)):
    # search api instead of /subjects so feeds stick to english titles
    cache_key = f"genre_{genre}_{limit}"
    try:
        data = _cached_get(
            cache_key, genre_cache,
            "https://openlibrary.org/search.json",
            params={"subject": genre, "language": "eng", "limit": limit, "fields": SEARCH_FIELDS},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="couldn't reach openlibrary")
    return {"books": docs_to_books(data.get("docs", []), db)}


# openlibrary subjects that say nothing about taste
SUBJECT_STOPLIST = {
    "fiction", "literature", "novels", "classic literature", "classics",
    "english literature", "american literature", "long now manual for civilization",
    "accessible book", "protected daisy", "in library", "open library staff picks",
    "large type books", "translations into english", "new york times bestseller",
    "fiction in english", "audiobooks", "juvenile fiction",
}


def top_subjects(subject_lists, k=3):
    counts = {}
    for subjects in subject_lists:
        for s in subjects:
            s = s.strip().lower()
            if s in SUBJECT_STOPLIST or len(s) > 30:
                continue
            counts[s] = counts.get(s, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])
    return [s for s, _ in ranked[:k]]


@app.get("/recommendations")
def recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = (
        db.query(UserBook)
        .filter(UserBook.user_id == current_user.id, UserBook.work_id.isnot(None))
        .order_by(UserBook.updated_at.desc())
        .all()
    )
    if not books:
        return {"books": [], "based_on": []}

    owned = {b.work_id for b in books}
    cache_key = (current_user.id, tuple(sorted(owned)))
    with _cache_lock:
        if cache_key in rec_cache:
            return rec_cache[cache_key]

    subject_lists = []
    for b in books[:8]:
        try:
            data = _cached_get(
                f"book_{b.work_id}", book_cache,
                f"https://openlibrary.org/works/{b.work_id}.json",
            )
            subject_lists.append(data.get("subjects", []))
        except Exception:
            continue

    picked, based_on, seen = [], [], set(owned)
    for subject in top_subjects(subject_lists):
        try:
            data = _cached_get(
                f"rec_{subject}", genre_cache,
                "https://openlibrary.org/search.json",
                params={"subject": subject, "language": "eng", "limit": 30, "fields": SEARCH_FIELDS},
            )
        except Exception:
            continue
        fresh = [bk for bk in docs_to_books(data.get("docs", []), db) if bk["work_id"] not in seen]
        if fresh:
            based_on.append(subject)
            for bk in fresh:
                seen.add(bk["work_id"])
                picked.append(bk)
        if len(picked) >= 20:
            break

    result = {"books": picked[:20], "based_on": based_on}
    with _cache_lock:
        rec_cache[cache_key] = result
    return result


@app.get("/search")
def search_books(q: str, limit: int = 20, db: Session = Depends(get_db)):
    cache_key = f"search_{q.lower()}_{limit}"
    try:
        data = _cached_get(
            cache_key, search_cache,
            "https://openlibrary.org/search.json",
            params={"q": q, "limit": limit, "fields": SEARCH_FIELDS},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="couldn't reach openlibrary")
    return {"books": docs_to_books(data.get("docs", []), db)}


@app.get("/book/{work_id}")
def get_book(work_id: str, db: Session = Depends(get_db)):
    cache_key = f"book_{work_id}"
    url = f"https://openlibrary.org/works/{work_id}.json"
    try:
        data = _cached_get(cache_key, book_cache, url)
    except Exception:
        raise HTTPException(status_code=502, detail="couldn't reach openlibrary")

    description = data.get("description", "")
    if isinstance(description, dict):
        description = description.get("value", "")

    subjects = data.get("subjects", [])[:6]

    authors = []
    for a in data.get("authors", []):
        author_key = a.get("author", {}).get("key", "")
        if author_key:
            try:
                author_data = _cached_get(
                    f"author_{author_key}", book_cache, f"https://openlibrary.org{author_key}.json"
                )
                authors.append(author_data.get("name", "Unknown"))
            except Exception:
                authors.append("Unknown")

    covers = data.get("covers", [])
    cover = f"https://covers.openlibrary.org/b/id/{covers[0]}-L.jpg" if covers else ""

    community = community_rating(db, work_id)
    if not community:
        try:
            ol = _cached_get(
                f"ratings_{work_id}", book_cache,
                f"https://openlibrary.org/works/{work_id}/ratings.json",
            )
            summary = ol.get("summary") or {}
            community = openlibrary_rating(summary.get("average"), summary.get("count"))
        except Exception:
            community = openlibrary_rating(None, None)

    return {
        "title": data.get("title", ""),
        "authors": authors,
        "cover": cover,
        "description": description,
        "subjects": subjects,
        "first_publish_year": data.get("first_publish_date", ""),
        "work_id": work_id,
        "community": community,
    }


def _split_chunks(text, limit=450):
    # mymemory caps a request at ~500 chars
    sentences = re.split(r"(?<=[.!?])\s+", text.replace("\r", ""))
    pieces = []
    for s in sentences:
        s = s.strip()
        while len(s) > limit:
            cut = s.rfind(" ", 0, limit)
            cut = cut if cut > 0 else limit
            pieces.append(s[:cut])
            s = s[cut:].strip()
        if s:
            pieces.append(s)

    chunks, current = [], ""
    for piece in pieces:
        if len(current) + len(piece) + 1 > limit and current:
            chunks.append(current)
            current = piece
        else:
            current = f"{current} {piece}".strip()
    if current:
        chunks.append(current)
    return chunks


@app.get("/book/{work_id}/description")
def translate_description(work_id: str, lang: str = "pl"):
    cache_key = (work_id, lang)
    with _cache_lock:
        if cache_key in translation_cache:
            return translation_cache[cache_key]

    data = _cached_get(f"book_{work_id}", book_cache, f"https://openlibrary.org/works/{work_id}.json")
    description = data.get("description", "")
    if isinstance(description, dict):
        description = description.get("value", "")
    if not description:
        return {"description": ""}

    translated = []
    try:
        for chunk in _split_chunks(description[:2500]):
            r = requests.get(
                "https://api.mymemory.translated.net/get",
                params={"q": chunk, "langpair": f"en|{lang}"},
                timeout=15,
            ).json()
            if str(r.get("responseStatus")) != "200":
                raise ValueError(r.get("responseDetails", "translation failed"))
            text = r["responseData"]["translatedText"]
            # exhausted quota comes back as a 200 with a warning string
            if "MYMEMORY WARNING" in text.upper():
                raise ValueError("quota exhausted")
            translated.append(text)
    except Exception:
        raise HTTPException(status_code=502, detail="translation service unavailable")

    result = {"description": " ".join(translated)}
    with _cache_lock:
        translation_cache[cache_key] = result
    return result


@app.get("/book/{work_id}/metadata")
def get_book_metadata(work_id: str):
    cache_key = f"meta_{work_id}"
    with _cache_lock:
        if cache_key in meta_cache:
            return meta_cache[cache_key]

    pages = None
    try:
        ed = requests.get(
            f"https://openlibrary.org/works/{work_id}/editions.json",
            params={"limit": 20},
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


@app.get("/demo")
def demo():
    return {"profile": demo_profile(), "books": DEMO_BOOKS}


# production: `uvicorn main:server` serves the built frontend, api under /api
from pathlib import Path
from fastapi.responses import FileResponse

DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

server = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
server.mount("/api", app)

if DIST.is_dir():
    @server.get("/{path:path}")
    def spa(path: str):
        file = (DIST / path).resolve()
        if path and file.is_file() and file.is_relative_to(DIST):
            return FileResponse(file)
        # don't let browsers cache the spa shell
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})

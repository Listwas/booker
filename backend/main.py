from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests

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

class StatusUpdate(BaseModel):
    status: str


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
    stats = {
        "total": len(books),
        "reading": sum(1 for b in books if b.status == "reading"),
        "completed": sum(1 for b in books if b.status == "completed"),
        "plan": sum(1 for b in books if b.status == "plan"),
        "dropped": sum(1 for b in books if b.status == "dropped"),
        "hold": sum(1 for b in books if b.status == "hold"),
    }
    return {"username": current_user.username, "email": current_user.email, "stats": stats}


@app.get("/list")
def get_list(status: str = "all", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(UserBook).filter(UserBook.user_id == current_user.id)
    if status != "all":
        q = q.filter(UserBook.status == status)
    return q.all()


@app.post("/list")
def add_book(body: BookEntry, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = UserBook(user_id=current_user.id, **body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@app.patch("/list/{book_id}")
def update_status(book_id: int, body: StatusUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    entry.status = body.status
    db.commit()
    return entry


@app.delete("/list/{book_id}")
def remove_book(book_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(UserBook).filter(UserBook.id == book_id, UserBook.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"message": "deleted"}


@app.post("/seed")
def seed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(UserBook).filter(UserBook.user_id == current_user.id).delete()
    mock = [
        {"title": "The Name of the Wind", "author": "Patrick Rothfuss", "cover": "https://covers.openlibrary.org/b/id/9326654-M.jpg", "status": "completed", "rating": 9.1, "progress": 662},
        {"title": "The Way of Kings", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8146092-M.jpg", "status": "completed", "rating": 9.4, "progress": 1007},
        {"title": "Dune", "author": "Frank Herbert", "cover": "https://covers.openlibrary.org/b/id/8760472-M.jpg", "status": "reading", "rating": None, "progress": 312},
        {"title": "Neuromancer", "author": "William Gibson", "cover": "https://covers.openlibrary.org/b/id/8775481-M.jpg", "status": "plan", "rating": None, "progress": 0},
        {"title": "Blood Meridian", "author": "Cormac McCarthy", "cover": "https://covers.openlibrary.org/b/id/8231856-M.jpg", "status": "dropped", "rating": 6.0, "progress": 140},
        {"title": "Foundation", "author": "Isaac Asimov", "cover": "https://covers.openlibrary.org/b/id/8398800-M.jpg", "status": "hold", "rating": None, "progress": 80},
        {"title": "Mistborn", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8391784-M.jpg", "status": "completed", "rating": 8.7, "progress": 541},
        {"title": "Hyperion", "author": "Dan Simmons", "cover": "https://covers.openlibrary.org/b/id/360716-M.jpg", "status": "plan", "rating": None, "progress": 0},
    ]
    for m in mock:
        db.add(UserBook(user_id=current_user.id, **m))
    db.commit()
    return {"message": f"seeded {len(mock)} books"}


@app.get("/books/{genre}")
def get_books(genre: str, limit: int = 20):
    url = f"https://openlibrary.org/subjects/{genre}.json?limit={limit}"
    data = requests.get(url).json()
    books = []
    for w in data.get("works", []):
        cid = w.get("cover_id")
        if not cid:
            continue
        books.append({
            "title": w.get("title"),
            "author": w.get("authors", [{}])[0].get("name") if w.get("authors") else "Unknown",
            "cover": f"https://covers.openlibrary.org/b/id/{cid}-M.jpg"
        })
    return {"books": books}
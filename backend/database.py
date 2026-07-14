import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect, text, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.environ.get("BOOKER_DATABASE_URL", "sqlite:///./booker.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

STATUS_NAMES = ["reading", "plan", "completed", "dropped", "hold"]


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    # data-url images, resized client-side
    avatar = Column(Text, nullable=True)
    banner = Column(Text, nullable=True)

    entries = relationship("UserBook", back_populates="user", cascade="all, delete-orphan")


class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    books = relationship("Book", back_populates="author")


class Status(Base):
    __tablename__ = "statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    cover = Column(String, default="")
    work_id = Column(String, nullable=True, index=True)
    author_id = Column(Integer, ForeignKey("authors.id"))

    author = relationship("Author", back_populates="books")
    entries = relationship("UserBook", back_populates="book")


class UserBook(Base):
    __tablename__ = "user_books"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    book_id = Column(Integer, ForeignKey("books.id"), index=True)
    status_id = Column(Integer, ForeignKey("statuses.id"))
    rating = Column(Float, nullable=True)
    progress = Column(Integer, nullable=True)
    total_pages = Column(Integer, nullable=True)
    rereads = Column(Integer, default=0)
    note = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="entries")
    book = relationship("Book", back_populates="entries")
    status = relationship("Status")


def seed_statuses():
    db = SessionLocal()
    try:
        if db.query(Status).count() == 0:
            for name in STATUS_NAMES:
                db.add(Status(name=name))
            db.commit()
    finally:
        db.close()


def _migrate():
    # older layout kept title/author/status as text right in user_books,
    # move that data into the normalized tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "user_books" not in tables:
        return
    cols = {c["name"] for c in inspector.get_columns("user_books")}
    if "title" not in cols:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE user_books RENAME TO user_books_old"))
        # indexes keep their names after a rename and would collide
        old_indexes = conn.execute(text(
            "SELECT name FROM sqlite_master WHERE type='index' "
            "AND tbl_name='user_books_old' AND name NOT LIKE 'sqlite_%'"
        )).fetchall()
        for (name,) in old_indexes:
            conn.execute(text(f'DROP INDEX "{name}"'))
    Base.metadata.create_all(bind=engine)
    seed_statuses()

    def as_dt(v):
        # raw selects hand dates back as strings
        if v is None or isinstance(v, datetime):
            return v
        return datetime.fromisoformat(v)

    db = SessionLocal()
    try:
        status_ids = {s.name: s.id for s in db.query(Status).all()}
        authors = {}
        books = {}
        rows = db.execute(text("SELECT * FROM user_books_old")).mappings().all()
        for r in rows:
            name = r["author"] or "Unknown"
            if name not in authors:
                author = Author(name=name)
                db.add(author)
                db.flush()
                authors[name] = author.id
            book_key = r["work_id"] or f"{r['title']}|{name}"
            if book_key not in books:
                book = Book(title=r["title"], cover=r["cover"] or "",
                            work_id=r["work_id"], author_id=authors[name])
                db.add(book)
                db.flush()
                books[book_key] = book.id
            db.add(UserBook(
                user_id=r["user_id"],
                book_id=books[book_key],
                status_id=status_ids.get(r["status"], status_ids["plan"]),
                rating=r["rating"],
                progress=r["progress"],
                total_pages=r["total_pages"],
                rereads=r["rereads"] or 0,
                note=r["note"],
                started_at=as_dt(r["started_at"]),
                finished_at=as_dt(r["finished_at"]),
                created_at=as_dt(r["created_at"]),
                updated_at=as_dt(r["updated_at"]),
            ))
        db.commit()
        db.execute(text("DROP TABLE user_books_old"))
        db.commit()
    finally:
        db.close()


_migrate()
Base.metadata.create_all(bind=engine)
seed_statuses()

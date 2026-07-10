import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect, text, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.environ.get("BOOKER_DATABASE_URL", "sqlite:///./booker.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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

    books = relationship("UserBook", back_populates="user", cascade="all, delete-orphan")


class UserBook(Base):
    __tablename__ = "user_books"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String)
    author = Column(String)
    cover = Column(String, default="")
    status = Column(String, default="plan")
    rating = Column(Float, nullable=True)
    progress = Column(Integer, nullable=True)
    total_pages = Column(Integer, nullable=True)
    rereads = Column(Integer, default=0)
    work_id = Column(String, nullable=True, index=True)
    note = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="books")


def _migrate():
    # create_all won't alter existing tables, add new columns by hand
    added = {
        "user_books": {
            "note": "TEXT",
            "started_at": "DATETIME",
            "finished_at": "DATETIME",
        },
        "users": {
            "avatar": "TEXT",
            "banner": "TEXT",
        },
    }
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    with engine.begin() as conn:
        for table, columns in added.items():
            if table not in tables:
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, sql_type in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
            # backfill finished_at for books completed before the column existed
            if table == "user_books" and "finished_at" not in existing:
                conn.execute(text(
                    "UPDATE user_books SET finished_at = updated_at "
                    "WHERE status = 'completed' AND finished_at IS NULL"
                ))


_migrate()
Base.metadata.create_all(bind=engine)

import csv
import io

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from conftest import make_user, image_data
from database import SessionLocal


def test_progress_is_validated_against_final_page_count(client):
    headers = make_user(client)
    body = {"title": "  My book  ", "author": "  Writer  ", "total_pages": 100}
    assert client.post("/list", headers=headers, json={**body, "progress": 101}).status_code == 400
    entry = client.post("/list", headers=headers, json=body).json()
    assert entry["title"] == "My book"
    assert entry["author"] == "Writer"
    response = client.patch(f"/list/{entry['id']}", headers=headers,
                            json={"progress": 150, "total_pages": 200})
    assert response.status_code == 200
    assert response.json()["progress"] == 150
    assert response.json()["total_pages"] == 200
    response = client.patch(f"/list/{entry['id']}", headers=headers,
                            json={"progress": 250, "total_pages": 200})
    assert response.status_code == 400
    assert client.get("/list", headers=headers).json()[0]["progress"] == 150


def test_completed_creation_and_combined_update_fill_progress(client):
    headers = make_user(client)
    entry = client.post("/list", headers=headers, json={
        "title": "Book", "author": "Writer", "status": "completed", "total_pages": 100,
    }).json()
    assert entry["progress"] == 100
    response = client.patch(f"/list/{entry['id']}", headers=headers,
                            json={"status": "completed", "total_pages": 200})
    assert response.json()["progress"] == 200


@pytest.mark.parametrize("status", ["plan", "reading", "hold", "dropped"])
def test_reread_requires_completion(client, status):
    headers = make_user(client)
    entry = client.post("/list", headers=headers, json={
        "title": "Book", "author": "Writer", "status": status, "total_pages": 100,
    }).json()
    assert client.post(f"/list/{entry['id']}/reread", headers=headers).status_code == 400
    assert client.get("/profile", headers=headers).json()["stats"]["total_pages_read"] == 0


def test_repeated_reread_requests_do_not_invent_completions(client):
    headers = make_user(client)
    entry = client.post("/list", headers=headers, json={
        "title": "Book", "author": "Writer", "status": "completed", "total_pages": 100,
    }).json()
    url = f"/list/{entry['id']}/reread"
    assert client.post(url, headers=headers).status_code == 200
    assert client.post(url, headers=headers).status_code == 400
    assert client.get("/profile", headers=headers).json()["stats"]["total_pages_read"] == 100
    client.patch(f"/list/{entry['id']}", headers=headers, json={"status": "completed"})
    assert client.get("/profile", headers=headers).json()["stats"]["total_pages_read"] == 200


@pytest.mark.parametrize("field", ["title", "author"])
def test_whitespace_only_names_are_rejected(client, field):
    headers = make_user(client)
    assert client.post("/list", headers=headers, json={
        "title": "Book", "author": "Writer", field: " \t\n ",
    }).status_code == 422


@pytest.mark.parametrize("image", [
    "data:image/png;not-base64", "data:image/jpeg;base64,aGVsbG8=",
    "data:image/png;base64,%%", "data:image/svg+xml;base64,PHN2Zy8+",
])
def test_invalid_images_are_rejected(client, image):
    headers = make_user(client)
    assert client.post("/me/avatar", headers=headers, json={"image": image}).status_code == 422
    assert client.get("/me", headers=headers).json()["avatar"] is None


@pytest.mark.parametrize("format", ["JPEG", "PNG", "WEBP"])
def test_real_images_are_accepted(client, format):
    headers = make_user(client)
    image = image_data(format)
    assert client.post("/me/avatar", headers=headers, json={"image": image}).status_code == 200


def test_image_mime_must_match_and_dimensions_are_bounded(client):
    headers = make_user(client)
    image = image_data("PNG").replace("image/png", "image/jpeg")
    assert client.post("/me/avatar", headers=headers, json={"image": image}).status_code == 422
    image = image_data("PNG", (1601, 1))
    assert client.post("/me/banner", headers=headers, json={"image": image}).status_code == 422


@pytest.mark.parametrize("value", ["=1+1", "+1+1", "-1+1", "@SUM(1)", "  =1+1", "\t=1+1"])
def test_csv_protects_spreadsheets_but_json_keeps_original_text(client, value):
    headers = make_user(client)
    entry = client.post("/list", headers=headers, json={"title": "Book", "author": "Writer"}).json()
    client.patch(f"/list/{entry['id']}", headers=headers, json={"note": value})
    raw = client.get("/export", headers=headers).json()[0]["note"]
    rows = list(csv.DictReader(io.StringIO(client.get("/export?format=csv", headers=headers).text)))
    assert raw == value.strip()
    assert rows[0]["note"] == "'" + raw


def test_required_foreign_keys_and_work_uniqueness_are_enforced(client):
    with SessionLocal() as db:
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO user_books (user_id,book_id,status_id,rereads) VALUES(NULL,NULL,NULL,0)"))
        db.rollback()
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO user_books (user_id,book_id,status_id,rereads) VALUES(999,999,999,0)"))
        db.rollback()
    headers = make_user(client)
    client.post("/list", headers=headers, json={"title": "Book", "author": "Writer", "work_id": "OL1W"})
    with SessionLocal() as db:
        with pytest.raises(IntegrityError):
            db.execute(text("INSERT INTO books(title,author_id,work_id) SELECT 'Duplicate',author_id,work_id FROM books"))
        db.rollback()


def test_database_rejects_duplicate_library_entry_and_invalid_progress(client):
    headers = make_user(client)
    client.post("/list", headers=headers, json={"title": "Book", "author": "Writer", "total_pages": 100})
    with SessionLocal() as db:
        for sql in (
            "INSERT INTO user_books(user_id,book_id,status_id,rereads) SELECT user_id,book_id,status_id,0 FROM user_books",
            "UPDATE user_books SET progress=101",
            "UPDATE user_books SET rating=6",
            "UPDATE user_books SET rereads=-1",
        ):
            with pytest.raises(IntegrityError):
                db.execute(text(sql))
            db.rollback()

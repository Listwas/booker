from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from auth import ALGORITHM, SECRET_KEY
from conftest import make_user
from database import SessionLocal, User


def test_register_and_me(client):
    headers = make_user(client, "book_worm")
    r = client.get("/me", headers=headers)
    assert r.status_code == 200
    assert r.json() == {
        "username": "book_worm",
        "email": "book_worm@example.com",
        "avatar": None,
        "banner": None,
    }


def test_register_duplicate_username(client):
    make_user(client, "reader")
    r = client.post("/register", json={
        "username": "reader",
        "email": "other@example.com",
        "password": "secret123",
    })
    assert r.status_code == 400
    assert r.json()["detail"] == "Username taken"


def test_register_duplicate_email(client):
    make_user(client, "reader")
    r = client.post("/register", json={
        "username": "other",
        "email": "reader@example.com",
        "password": "secret123",
    })
    assert r.status_code == 400
    assert r.json()["detail"] == "Email already registered"


def test_register_validation(client):
    base = {"email": "a@example.com", "password": "secret123"}
    assert client.post("/register", json={**base, "username": "ab"}).status_code == 422
    assert client.post("/register", json={**base, "username": "bad name!"}).status_code == 422
    assert client.post("/register", json={
        "username": "reader", "email": "not-an-email", "password": "secret123",
    }).status_code == 422
    assert client.post("/register", json={
        "username": "reader", "email": "a@example.com", "password": "123",
    }).status_code == 422


def test_login_wrong_password(client):
    make_user(client, "reader")
    r = client.post("/login", data={"username": "reader", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_valid_token(client):
    assert client.get("/me").status_code == 401
    assert client.get("/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_deleted_account_token_cannot_access_recreated_account(client):
    old_headers = make_user(client)
    with SessionLocal() as db:
        old_id = db.query(User).filter(User.username == "reader").one().id

    assert client.post("/me/delete", headers=old_headers,
                       json={"password": "secret123"}).status_code == 200
    new_headers = make_user(client)
    with SessionLocal() as db:
        assert db.query(User).filter(User.username == "reader").one().id == old_id

    r = client.post("/list", headers=new_headers,
                    json={"title": "New owner's book", "author": "Someone"})
    assert r.status_code == 200
    book_id = r.json()["id"]
    assert client.get("/me", headers=old_headers).status_code == 401
    assert client.get("/list", headers=old_headers).status_code == 401
    assert client.patch(f"/list/{book_id}", headers=old_headers,
                        json={"note": "old owner's note"}).status_code == 401
    assert client.delete(f"/list/{book_id}", headers=old_headers).status_code == 401
    books = client.get("/list", headers=new_headers).json()
    assert len(books) == 1
    assert books[0]["note"] is None


def test_password_change_invalidates_existing_tokens(client):
    old_headers = make_user(client)
    r = client.post("/me/password", headers=old_headers, json={
        "current_password": "secret123", "new_password": "newsecret1",
    })
    assert r.status_code == 200
    assert client.get("/me", headers=old_headers).status_code == 401

    r = client.post("/login", data={"username": "reader", "password": "newsecret1"})
    assert r.status_code == 200
    new_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/me", headers=new_headers).status_code == 200


@pytest.mark.parametrize("claims", [
    {"sub": "reader"},
    {"sub": "1"},
    {"sub": "1", "auth": 123},
    {"sub": "1", "auth": "ą"},
    {},
])
def test_incomplete_or_old_token_is_rejected(client, claims):
    make_user(client)
    token = jwt.encode({
        **claims, "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }, SECRET_KEY, algorithm=ALGORITHM)
    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401

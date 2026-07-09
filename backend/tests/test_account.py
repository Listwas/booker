import csv
import io

from conftest import make_user

BOOK = {"title": "Dune", "author": "Frank Herbert", "work_id": "OL893415W", "total_pages": 896}


def test_login_rate_limited_after_failed_attempts(client):
    make_user(client, "reader")
    for _ in range(5):
        r = client.post("/login", data={"username": "reader", "password": "wrong"})
        assert r.status_code == 401
    r = client.post("/login", data={"username": "reader", "password": "wrong"})
    assert r.status_code == 429
    # even the right password is blocked while the window lasts
    r = client.post("/login", data={"username": "reader", "password": "secret123"})
    assert r.status_code == 429


def test_successful_login_resets_attempts(client):
    make_user(client, "reader")
    for _ in range(3):
        client.post("/login", data={"username": "reader", "password": "wrong"})
    r = client.post("/login", data={"username": "reader", "password": "secret123"})
    assert r.status_code == 200
    for _ in range(5):
        r = client.post("/login", data={"username": "reader", "password": "wrong"})
        assert r.status_code == 401


def test_export_json(client):
    headers = make_user(client)
    client.post("/list", json={**BOOK, "rating": 4}, headers=headers)

    r = client.get("/export?format=json", headers=headers)
    assert r.status_code == 200
    assert "attachment" in r.headers["content-disposition"]
    data = r.json()
    assert len(data) == 1
    assert data[0]["title"] == "Dune"
    assert data[0]["rating"] == 4


def test_export_csv(client):
    headers = make_user(client)
    client.post("/list", json=BOOK, headers=headers)
    client.patch("/list/1", json={"note": "spice"}, headers=headers)

    r = client.get("/export?format=csv", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert len(rows) == 1
    assert rows[0]["title"] == "Dune"
    assert rows[0]["note"] == "spice"


def test_avatar_and_banner(client):
    headers = make_user(client)
    img = "data:image/jpeg;base64,aGVsbG8="

    r = client.post("/me/avatar", json={"image": img}, headers=headers)
    assert r.status_code == 200
    r = client.post("/me/banner", json={"image": img}, headers=headers)
    assert r.status_code == 200

    me = client.get("/me", headers=headers).json()
    assert me["avatar"] == img
    assert me["banner"] == img

    # not-an-image payloads are rejected, null resets
    assert client.post("/me/avatar", json={"image": "https://evil.example/x.js"}, headers=headers).status_code == 422
    r = client.post("/me/avatar", json={"image": None}, headers=headers)
    assert r.status_code == 200
    assert client.get("/me", headers=headers).json()["avatar"] is None


def test_change_password(client):
    headers = make_user(client, "reader")

    r = client.post("/me/password", json={"current_password": "wrong", "new_password": "newsecret1"}, headers=headers)
    assert r.status_code == 403

    r = client.post("/me/password", json={"current_password": "secret123", "new_password": "123"}, headers=headers)
    assert r.status_code == 422

    r = client.post("/me/password", json={"current_password": "secret123", "new_password": "newsecret1"}, headers=headers)
    assert r.status_code == 200

    assert client.post("/login", data={"username": "reader", "password": "secret123"}).status_code == 401
    assert client.post("/login", data={"username": "reader", "password": "newsecret1"}).status_code == 200


def test_delete_account(client):
    headers = make_user(client, "reader")
    client.post("/list", json=BOOK, headers=headers)

    r = client.post("/me/delete", json={"password": "wrong"}, headers=headers)
    assert r.status_code == 403

    r = client.post("/me/delete", json={"password": "secret123"}, headers=headers)
    assert r.status_code == 200

    # gone: token no longer resolves, login fails
    assert client.get("/me", headers=headers).status_code == 401
    r = client.post("/login", data={"username": "reader", "password": "secret123"})
    assert r.status_code == 401

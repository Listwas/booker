from conftest import make_user


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

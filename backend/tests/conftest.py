import os
import sys
import tempfile

# point the app at a throwaway db before database.py gets imported
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["BOOKER_DATABASE_URL"] = f"sqlite:///{_tmp.name}"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient

import main
from database import Base, engine, seed_statuses


@pytest.fixture(autouse=True)
def no_openlibrary(monkeypatch):
    # tests never talk to openlibrary
    monkeypatch.setattr(main, "_fetch_pages_background", lambda *a, **k: None)


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_statuses()
    main.login_attempts.clear()
    main.rec_cache.clear()
    main.translation_cache.clear()
    with TestClient(main.app) as c:
        yield c


def make_user(client, username="reader", password="secret123"):
    # register + login, returns auth headers
    r = client.post("/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": password,
    })
    assert r.status_code == 200, r.text
    r = client.post("/login", data={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

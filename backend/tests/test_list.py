from conftest import make_user

BOOK = {
    "title": "Dune",
    "author": "Frank Herbert",
    "cover": "",
    "status": "plan",
    "total_pages": 896,
    "work_id": "OL893415W",
}


def add(client, headers, **overrides):
    r = client.post("/list", json={**BOOK, **overrides}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_add_and_list(client):
    headers = make_user(client)
    book = add(client, headers)
    assert book["title"] == "Dune"
    assert book["status"] == "plan"

    r = client.get("/list", headers=headers)
    assert [b["id"] for b in r.json()] == [book["id"]]


def test_duplicate_work_id_rejected(client):
    headers = make_user(client)
    add(client, headers)
    r = client.post("/list", json=BOOK, headers=headers)
    assert r.status_code == 400
    assert "already" in r.json()["detail"]


def test_duplicate_custom_book_rejected(client):
    headers = make_user(client)
    custom = {"title": "My Zine", "author": "Me", "work_id": None, "total_pages": None}
    add(client, headers, **custom)
    r = client.post("/list", json={**BOOK, **custom}, headers=headers)
    assert r.status_code == 400


def test_lists_are_per_user(client):
    h1 = make_user(client, "alice")
    h2 = make_user(client, "bob")
    book = add(client, h1)

    assert client.get("/list", headers=h2).json() == []
    # bob can't touch alice's entry
    assert client.patch(f"/list/{book['id']}", json={"rating": 5}, headers=h2).status_code == 404
    assert client.delete(f"/list/{book['id']}", headers=h2).status_code == 404


def test_completing_sets_progress_and_finished_at(client):
    headers = make_user(client)
    book = add(client, headers)
    r = client.patch(f"/list/{book['id']}", json={"status": "completed"}, headers=headers)
    updated = r.json()
    assert updated["progress"] == 896
    assert updated["finished_at"] is not None
    assert updated["started_at"] is not None

    # leaving completed clears the finish date
    r = client.patch(f"/list/{book['id']}", json={"status": "reading"}, headers=headers)
    assert r.json()["finished_at"] is None


def test_rating_validation_and_clearing(client):
    headers = make_user(client)
    book = add(client, headers)

    assert client.patch(f"/list/{book['id']}", json={"rating": 6}, headers=headers).status_code == 422
    assert client.patch(f"/list/{book['id']}", json={"rating": -1}, headers=headers).status_code == 422

    r = client.patch(f"/list/{book['id']}", json={"rating": 4.5}, headers=headers)
    assert r.json()["rating"] == 4.5

    r = client.patch(f"/list/{book['id']}", json={"clear_rating": True}, headers=headers)
    assert r.json()["rating"] is None


def test_progress_cannot_exceed_total(client):
    headers = make_user(client)
    book = add(client, headers)
    r = client.patch(f"/list/{book['id']}", json={"progress": 1000}, headers=headers)
    assert r.status_code == 400

    # lowering the total clamps existing progress
    client.patch(f"/list/{book['id']}", json={"progress": 800}, headers=headers)
    r = client.patch(f"/list/{book['id']}", json={"total_pages": 500}, headers=headers)
    assert r.json()["progress"] == 500


def test_note_saved_and_blank_note_cleared(client):
    headers = make_user(client)
    book = add(client, headers)

    r = client.patch(f"/list/{book['id']}", json={"note": "  loved the sandworms  "}, headers=headers)
    assert r.json()["note"] == "loved the sandworms"

    r = client.patch(f"/list/{book['id']}", json={"note": "   "}, headers=headers)
    assert r.json()["note"] is None


def test_reread_flow(client):
    headers = make_user(client)
    book = add(client, headers, status="completed")

    r = client.post(f"/list/{book['id']}/reread", headers=headers)
    updated = r.json()
    assert updated["rereads"] == 1
    assert updated["status"] == "reading"
    assert updated["progress"] == 0
    assert updated["finished_at"] is None

    r = client.post(f"/list/{book['id']}/reset-reread", headers=headers)
    assert r.json()["rereads"] == 0


def test_delete(client):
    headers = make_user(client)
    book = add(client, headers)
    assert client.delete(f"/list/{book['id']}", headers=headers).status_code == 200
    assert client.get("/list", headers=headers).json() == []


def test_profile_stats_and_monthly(client):
    headers = make_user(client)
    add(client, headers, status="completed")  # 896 pages, finished now
    add(client, headers, work_id="OL2W", title="Other", status="reading",
        total_pages=100)
    book = client.get("/list", headers=headers).json()
    reading = next(b for b in book if b["status"] == "reading")
    client.patch(f"/list/{reading['id']}", json={"progress": 50}, headers=headers)

    r = client.get("/profile", headers=headers)
    data = r.json()
    assert data["stats"]["total"] == 2
    assert data["stats"]["completed"] == 1
    assert data["stats"]["reading"] == 1
    assert data["stats"]["total_pages_read"] == 896 + 50

    monthly = data["monthly"]
    assert len(monthly) == 6
    # the book completed just now lands in the current (last) bucket
    assert monthly[-1]["books"] == 1
    assert monthly[-1]["pages"] == 896

import main
from conftest import make_user

OWNED = {"title": "The Time Machine", "author": "H. G. Wells", "work_id": "OL52267W", "total_pages": 200}

FAKE_WORK = {"subjects": ["Time travel in fiction", "Fiction", "Science Fiction", "Accessible book"]}

FAKE_SEARCH = {
    "docs": [
        {"title": "The Time Machine", "author_name": ["H. G. Wells"], "cover_i": 1, "key": "/works/OL52267W"},
        {"title": "The End of Eternity", "author_name": ["Isaac Asimov"], "cover_i": 2, "key": "/works/OL46385W",
         "ratings_average": 4.1234, "ratings_count": 321},
        {"title": "Kindred", "author_name": ["Octavia Butler"], "cover_i": 3, "key": "/works/OL675783W"},
    ]
}


def fake_cached_get(key, cache, url, params=None):
    if "search.json" in url:
        return FAKE_SEARCH
    return FAKE_WORK


def test_top_subjects_filters_noise():
    lists = [
        ["Fiction", "Time travel in fiction", "Accessible book"],
        ["Time travel in fiction", "Dystopias in fiction"],
    ]
    top = main.top_subjects(lists)
    assert top[0] == "time travel in fiction"
    assert "fiction" not in top
    assert "accessible book" not in top


def test_recommendations_exclude_owned_books(client, monkeypatch):
    monkeypatch.setattr(main, "_cached_get", fake_cached_get)
    headers = make_user(client)
    client.post("/list", json=OWNED, headers=headers)

    r = client.get("/recommendations", headers=headers)
    assert r.status_code == 200
    data = r.json()

    work_ids = [b["work_id"] for b in data["books"]]
    assert "OL52267W" not in work_ids           # already in the library
    assert "OL46385W" in work_ids
    assert "time travel in fiction" in data["based_on"]

    # unrated on booker falls back to openlibrary's reader rating
    eternity = next(b for b in data["books"] if b["work_id"] == "OL46385W")
    assert eternity["community"] == {"rating": 4.1, "count": 321, "source": "openlibrary"}
    kindred = next(b for b in data["books"] if b["work_id"] == "OL675783W")
    assert kindred["community"]["rating"] is None


def test_recommendations_empty_without_books(client):
    headers = make_user(client)
    r = client.get("/recommendations", headers=headers)
    assert r.json() == {"books": [], "based_on": []}

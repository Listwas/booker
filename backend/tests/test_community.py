from conftest import make_user

BOOK = {"title": "Dune", "author": "Frank Herbert", "work_id": "OL893415W", "total_pages": 896}


def test_community_rating_is_average_of_user_ratings(client):
    h1 = make_user(client, "alice")
    h2 = make_user(client, "bob")

    b1 = client.post("/list", json={**BOOK, "rating": 5}, headers=h1).json()
    client.post("/list", json={**BOOK, "rating": 4}, headers=h2)

    books = client.get("/list", headers=h1).json()
    community = books[0]["community"]
    assert community == {"rating": 4.5, "count": 2, "source": "booker"}

    # alice clears her rating -> only bob's counts
    client.patch(f"/list/{b1['id']}", json={"clear_rating": True}, headers=h1)
    books = client.get("/list", headers=h1).json()
    assert books[0]["community"] == {"rating": 4.0, "count": 1, "source": "booker"}


def test_unrated_book_has_no_community_rating(client):
    headers = make_user(client)
    client.post("/list", json=BOOK, headers=headers)
    books = client.get("/list", headers=headers).json()
    assert books[0]["community"] is None

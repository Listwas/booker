import pytest
import requests

import main
from conftest import make_user
from main import catalog_metadata


class Response:
    def __init__(self, data, status=200):
        self.data, self.status_code = data, status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(response=self)

    def json(self):
        return self.data


def test_shared_metadata_comes_from_catalog(client, monkeypatch):
    monkeypatch.setattr(main, "catalog_metadata", catalog_metadata)

    def fetch(url, **kwargs):
        if "/authors/" in url:
            return Response({"name": "Catalog Author"})
        return Response({"title": "Catalog title", "covers": [42],
                         "authors": [{"author": {"key": "/authors/OL1A"}}]})

    monkeypatch.setattr(main.requests, "get", fetch)
    for username, title in (("alice", "Fake title"), ("bob", "Different title")):
        headers = make_user(client, username)
        response = client.post("/list", headers=headers, json={
            "title": title, "author": "Fake author", "cover": "https://example.com/fake",
            "work_id": "OL1W",
        })
        assert response.status_code == 200, response.text
        assert response.json()["title"] == "Catalog title"
        assert response.json()["author"] == "Catalog Author"
        assert response.json()["cover"].endswith("42-L.jpg")


@pytest.mark.parametrize("status, payload, expected", [
    (404, {}, 404), (429, {}, 502), (500, {}, 502),
    (200, {"error": "notfound"}, 404), (200, [], 502),
    (200, {}, 502), (200, {"title": "T", "authors": "wrong"}, 502),
    (200, {"title": "T", "description": 42}, 502),
])
def test_catalog_errors_are_not_empty_successes(client, monkeypatch, status, payload, expected):
    calls = []
    def fetch(url, **kwargs):
        calls.append(url)
        return Response(payload, status)
    monkeypatch.setattr(main.requests, "get", fetch)
    assert client.get("/book/OL1W").status_code == expected
    assert len(calls) == 1


def test_timeout_and_invalid_json_are_controlled(client, monkeypatch):
    def timeout(*args, **kwargs):
        raise requests.Timeout()
    monkeypatch.setattr(main.requests, "get", timeout)
    assert client.get("/book/OL1W").status_code == 502
    assert client.get("/book/OL1W/description").status_code == 502


def test_failed_catalog_add_does_not_create_local_book(client, monkeypatch):
    monkeypatch.setattr(main, "catalog_metadata", catalog_metadata)
    monkeypatch.setattr(main.requests, "get", lambda *args, **kwargs: Response({}, 500))
    headers = make_user(client)
    response = client.post("/list", headers=headers, json={
        "title": "Untrusted", "author": "Untrusted", "work_id": "OL1W",
    })
    assert response.status_code == 502
    assert client.get("/list", headers=headers).json() == []


def test_redirects_use_canonical_identifier_and_detect_duplicates(client, monkeypatch):
    monkeypatch.setattr(main, "catalog_metadata", catalog_metadata)
    def fetch(url, **kwargs):
        if url.endswith("OL1W.json"):
            return Response({"type": {"key": "/type/redirect"}, "location": "/works/OL2W"})
        return Response({"title": "Real title"})
    monkeypatch.setattr(main.requests, "get", fetch)
    headers = make_user(client)
    response = client.post("/list", headers=headers, json={
        "title": "Ignored", "author": "Ignored", "work_id": "OL1W", "total_pages": 100,
    })
    assert response.status_code == 200
    assert response.json()["work_id"] == "OL2W"
    assert client.post("/list", headers=headers, json={
        "title": "Ignored", "author": "Ignored", "work_id": "OL2W",
    }).status_code == 400


def test_redirect_loop_is_bounded(client, monkeypatch):
    calls = []
    def fetch(url, **kwargs):
        calls.append(url)
        return Response({"type": {"key": "/type/redirect"}, "location": "/works/OL1W"})
    monkeypatch.setattr(main.requests, "get", fetch)
    assert client.get("/book/OL1W").status_code == 502
    assert len(calls) <= 4


def test_invalid_search_response_is_an_error(client, monkeypatch):
    monkeypatch.setattr(main.requests, "get", lambda *args, **kwargs: Response({"docs": None}))
    assert client.get("/search?q=hello").status_code == 502


@pytest.mark.parametrize("editions_status, expected", [(200, 200), (500, 502)])
def test_missing_page_count_is_distinct_from_metadata_outage(client, monkeypatch, editions_status, expected):
    def fetch(url, **kwargs):
        if url.endswith("/editions.json"):
            return Response({"entries": []}, editions_status)
        return Response({"title": "A book"})
    monkeypatch.setattr(main.requests, "get", fetch)
    response = client.get("/book/OL1W/metadata")
    assert response.status_code == expected
    if expected == 200:
        assert response.json() == {"total_pages": None}


def test_non_json_catalog_failure_is_not_cached(client, monkeypatch):
    class InvalidJSON(Response):
        def json(self):
            raise ValueError("Not JSON")
    monkeypatch.setattr(main.requests, "get", lambda *a, **k: InvalidJSON(None))
    assert client.get("/book/OL1W").status_code == 502
    monkeypatch.setattr(main.requests, "get", lambda *a, **k: Response({"title": "Recovered"}))
    assert client.get("/book/OL1W").json()["title"] == "Recovered"

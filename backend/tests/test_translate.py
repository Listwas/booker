import main


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


def test_split_chunks_respects_limit():
    text = ("Sentence one is here. " * 40).strip()
    chunks = main._split_chunks(text, limit=450)
    assert len(chunks) > 1
    assert all(len(c) <= 450 for c in chunks)
    assert " ".join(chunks).count("Sentence one") == 40


def test_split_chunks_handles_newlines_and_long_sentences():
    # paragraphs end with ".\n" (no space), typical for openlibrary
    text = ("First paragraph sentence.\nSecond paragraph, quite long. " * 20).strip()
    chunks = main._split_chunks(text, limit=450)
    assert all(len(c) <= 450 for c in chunks)

    # a single "sentence" longer than the limit gets hard-wrapped
    long_sentence = "word " * 200
    chunks = main._split_chunks(long_sentence, limit=450)
    assert len(chunks) > 1
    assert all(len(c) <= 450 for c in chunks)


def test_quota_warning_treated_as_failure(client, monkeypatch):
    monkeypatch.setattr(main, "_cached_get", lambda *a, **k: {"description": "Some text."})
    monkeypatch.setattr(
        main.requests, "get",
        lambda *a, **k: FakeResponse({
            "responseStatus": 200,
            "responseData": {"translatedText": "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY"},
        }),
    )
    r = client.get("/book/OL1W/description?lang=pl")
    assert r.status_code == 502


def test_description_translation(client, monkeypatch):
    calls = []

    def fake_cached_get(key, cache, url, params=None):
        return {"description": "A story about time travel. It was the first of its kind."}

    def fake_get(url, params=None, timeout=None):
        calls.append(params["q"])
        return FakeResponse({
            "responseStatus": 200,
            "responseData": {"translatedText": f"PL[{params['q'][:10]}]"},
        })

    monkeypatch.setattr(main, "_cached_get", fake_cached_get)
    monkeypatch.setattr(main.requests, "get", fake_get)

    r = client.get("/book/OL1W/description?lang=pl")
    assert r.status_code == 200
    assert r.json()["description"].startswith("PL[")
    assert len(calls) >= 1

    # second hit comes from the cache, no new api calls
    before = len(calls)
    r = client.get("/book/OL1W/description?lang=pl")
    assert r.status_code == 200
    assert len(calls) == before


def test_description_translation_failure(client, monkeypatch):
    monkeypatch.setattr(main, "_cached_get", lambda *a, **k: {"description": "Some text."})
    monkeypatch.setattr(
        main.requests, "get",
        lambda *a, **k: FakeResponse({"responseStatus": 429, "responseDetails": "quota"}),
    )
    r = client.get("/book/OL1W/description?lang=pl")
    assert r.status_code == 502

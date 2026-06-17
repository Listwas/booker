"""Deterministic seeded community rating.

Replaces the hardcoded "8.4 (2134)" that used to live on every BookCard.
Every book gets a stable, realistic-looking average (3.0-4.9) and review
count derived from its work_id, so the same book always shows the same
rating on the card, the search results and the detail page.
"""


def _hash_string(s: str) -> int:
    h = 0
    for ch in s:
        h = ord(ch) + ((h << 5) - h)
        h &= 0xFFFFFFFF
    return abs(h)


def community_rating(work_id: str | None) -> dict:
    seed = _hash_string(work_id or "unknown-book")
    rating = round(3 + (seed % 20) / 10, 1)
    count = 8 + (seed % 3120)
    return {"rating": rating, "count": count}

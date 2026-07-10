"""Community ratings aggregated from what users actually rated."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from database import UserBook


def community_ratings(db: Session, work_ids: list[str]) -> dict[str, dict]:
    """One aggregate query for a whole batch (feeds, search results)."""
    ids = [w for w in work_ids if w]
    if not ids:
        return {}
    rows = (
        db.query(
            UserBook.work_id,
            func.avg(UserBook.rating),
            func.count(UserBook.rating),
        )
        .filter(UserBook.work_id.in_(ids), UserBook.rating.isnot(None))
        .group_by(UserBook.work_id)
        .all()
    )
    return {
        work_id: {"rating": round(avg, 1), "count": count, "source": "booker"}
        for work_id, avg, count in rows
    }


def community_rating(db: Session, work_id: str | None) -> dict | None:
    if work_id:
        return community_ratings(db, [work_id]).get(work_id)
    return None

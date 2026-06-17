"""Demo library + seed data.

DEMO_BOOKS is shown to logged-out visitors (read-only),
so they can browse a library before signing up
"""

DEMO_BOOKS = [
    {"title": "The Name of the Wind", "author": "Patrick Rothfuss", "cover": "https://covers.openlibrary.org/b/id/9326654-M.jpg", "status": "completed", "rating": 5.0, "progress": 662, "total_pages": 662, "rereads": 0, "work_id": "OL17354253W"},
    {"title": "The Way of Kings", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8146092-M.jpg", "status": "completed", "rating": 5.0, "progress": 1007, "total_pages": 1007, "rereads": 1, "work_id": "OL15646042W"},
    {"title": "Dune", "author": "Frank Herbert", "cover": "https://covers.openlibrary.org/b/id/8760472-M.jpg", "status": "reading", "rating": None, "progress": 312, "total_pages": 896, "rereads": 0, "work_id": "OL893415W"},
    {"title": "Neuromancer", "author": "William Gibson", "cover": "https://covers.openlibrary.org/b/id/8775481-M.jpg", "status": "plan", "rating": None, "progress": 0, "total_pages": 271, "rereads": 0, "work_id": "OL834643W"},
    {"title": "Blood Meridian", "author": "Cormac McCarthy", "cover": "https://covers.openlibrary.org/b/id/8231856-M.jpg", "status": "dropped", "rating": 3.0, "progress": 140, "total_pages": 351, "rereads": 0, "work_id": "OL98567W"},
    {"title": "Foundation", "author": "Isaac Asimov", "cover": "https://covers.openlibrary.org/b/id/8398800-M.jpg", "status": "hold", "rating": None, "progress": 80, "total_pages": 255, "rereads": 0, "work_id": "OL46534W"},
    {"title": "Mistborn", "author": "Brandon Sanderson", "cover": "https://covers.openlibrary.org/b/id/8391784-M.jpg", "status": "completed", "rating": 4.0, "progress": 541, "total_pages": 541, "rereads": 0, "work_id": "OL57218W"},
    {"title": "Hyperion", "author": "Dan Simmons", "cover": "https://covers.openlibrary.org/b/id/360716-M.jpg", "status": "plan", "rating": None, "progress": 0, "total_pages": 482, "rereads": 0, "work_id": "OL160426W"},
]


def demo_profile() -> dict:
    total_pages_read = 0
    for b in DEMO_BOOKS:
        base = 0
        if b["status"] == "completed" and b["total_pages"]:
            base = b["total_pages"]
        elif b["progress"]:
            base = b["progress"]
        total_pages_read += base + (b["rereads"] or 0) * (b["total_pages"] or 0)

    total_minutes = total_pages_read
    stats = {
        "total": len(DEMO_BOOKS),
        "reading": sum(1 for b in DEMO_BOOKS if b["status"] == "reading"),
        "completed": sum(1 for b in DEMO_BOOKS if b["status"] == "completed"),
        "plan": sum(1 for b in DEMO_BOOKS if b["status"] == "plan"),
        "dropped": sum(1 for b in DEMO_BOOKS if b["status"] == "dropped"),
        "hold": sum(1 for b in DEMO_BOOKS if b["status"] == "hold"),
        "total_pages_read": total_pages_read,
        "reading_time_hours": total_minutes // 60,
        "reading_time_days": (total_minutes // 60) // 24,
    }
    return {"username": "demo_reader", "email": "demo@booker.app", "stats": stats}

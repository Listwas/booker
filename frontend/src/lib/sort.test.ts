import { describe, it, expect } from "vitest"
import { sortBooks } from "./sort"
import type { UserBook } from "./types"

function book(overrides: Partial<UserBook>): UserBook {
    return {
        id: 1,
        user_id: 1,
        title: "Untitled",
        author: "Unknown",
        cover: "",
        status: "plan",
        rating: null,
        progress: null,
        total_pages: null,
        rereads: 0,
        work_id: null,
        note: null,
        started_at: null,
        finished_at: null,
        created_at: null,
        updated_at: null,
        ...overrides,
    }
}

const books = [
    book({ id: 1, title: "Dune", author: "Herbert", rating: 4, created_at: "2026-01-10T00:00:00" }),
    book({ id: 2, title: "Anathem", author: "Stephenson", rating: null, created_at: "2026-03-01T00:00:00" }),
    book({ id: 3, title: "Blindsight", author: "Watts", rating: 5, created_at: "2026-02-15T00:00:00" }),
]

describe("sortBooks", () => {
    it("sorts by title a-z", () => {
        expect(sortBooks(books, "title").map((b) => b.title)).toEqual([
            "Anathem", "Blindsight", "Dune",
        ])
    })

    it("sorts by author a-z", () => {
        expect(sortBooks(books, "author").map((b) => b.author)).toEqual([
            "Herbert", "Stephenson", "Watts",
        ])
    })

    it("sorts by rating, highest first, unrated last", () => {
        expect(sortBooks(books, "rating").map((b) => b.id)).toEqual([3, 1, 2])
    })

    it("sorts by most recently added by default", () => {
        expect(sortBooks(books, "recent").map((b) => b.id)).toEqual([2, 3, 1])
    })

    it("does not mutate the input array", () => {
        const before = books.map((b) => b.id)
        sortBooks(books, "title")
        expect(books.map((b) => b.id)).toEqual(before)
    })
})

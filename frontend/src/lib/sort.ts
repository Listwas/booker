import type { UserBook } from "./types"

export const SORTS = [
    { key: "recent", label: "recently added" },
    { key: "title", label: "title a-z" },
    { key: "author", label: "author a-z" },
    { key: "rating", label: "rating" },
] as const

export type SortKey = (typeof SORTS)[number]["key"]

export function sortBooks(books: UserBook[], sort: SortKey): UserBook[] {
    const copy = [...books]
    switch (sort) {
        case "title":
            return copy.sort((a, b) => a.title.localeCompare(b.title))
        case "author":
            return copy.sort((a, b) => a.author.localeCompare(b.author))
        case "rating":
            return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        default:
            return copy.sort(
                (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0)
            )
    }
}

import type { CommunityRating } from "./types"

// Client-side mirror of backend/community.py 
// Keeps the rating consistent with what
// the BookCard shows on the home / search pages.

function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
        hash |= 0
    }
    return Math.abs(hash)
}

export function communityRating(workId: string | null | undefined): CommunityRating {
    const seed = hashString(workId || "unknown-book")
    const rating = Math.round(3 + (seed % 20) / 10) / 1
    const count = 8 + (seed % 3120)
    return { rating, count }
}
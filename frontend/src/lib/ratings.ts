import type { QueryClient } from "@tanstack/react-query"

export function invalidateRatings(client: QueryClient) {
    return Promise.all(["book", "genre", "search", "recommendations"].map((key) =>
        client.invalidateQueries({ queryKey: [key] })
    ))
}

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import styles from './BookFeed.module.css'
import BookCard from '../../components/BookCard.tsx'
import BookCardSkeleton from '../../components/BookCardSkeleton.tsx'
import { useAuth } from '../../context/AuthContext'
import { apiGenre, apiRecommendations } from '../../lib/api'
import type { OpenLibraryBook } from '../../lib/types'

const SCROLL_AMOUNT = 196 * 4

interface FeedRowProps {
    header: string
    sub?: string
    books: OpenLibraryBook[]
    isLoading: boolean
}

function FeedRow({ header, sub, books, isLoading }: FeedRowProps) {
    const ref = useRef<HTMLDivElement>(null)

    const scroll = (dir: number) => {
        ref.current?.scrollBy({ left: SCROLL_AMOUNT * dir, behavior: "smooth" })
    }

    return (
        <div className={styles.feed_block}>
            <h2>
                {header}
                {sub && <span className={styles.feed_sub}>{sub}</span>}
            </h2>
            <div className={styles.carousel_wrapper}>
                <button className={`${styles.arrow} ${styles.arrow_left}`} onClick={() => scroll(-1)}>‹</button>

                <div className={styles.cards_row} ref={ref}>
                    {isLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div className={styles.card_wrap} key={i}>
                                <BookCardSkeleton />
                            </div>
                        ))
                        : books.map((b) => (
                            <div className={styles.card_wrap} key={b.work_id}>
                                <BookCard book={b} />
                            </div>
                        ))}
                </div>

                <button className={`${styles.arrow} ${styles.arrow_right}`} onClick={() => scroll(1)}>›</button>
            </div>
        </div>
    )
}

function BookFeed({ header, genre }: { header?: string; genre: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ["genre", genre],
        queryFn: () => apiGenre(genre),
        staleTime: 30 * 60 * 1000,
    })

    return (
        <FeedRow
            header={header ?? genre.replace(/-/g, " ")}
            books={data?.books ?? []}
            isLoading={isLoading}
        />
    )
}

export function RecommendedFeed() {
    const { token } = useAuth()

    const { data, isLoading } = useQuery({
        queryKey: ["recommendations"],
        queryFn: () => apiRecommendations(token!),
        enabled: !!token,
        staleTime: 30 * 60 * 1000,
    })

    if (!token) return null
    if (!isLoading && (data?.books.length ?? 0) === 0) return null

    return (
        <FeedRow
            header="picked for you"
            sub={data?.based_on.length ? `because you read ${data.based_on.join(", ")}` : undefined}
            books={data?.books ?? []}
            isLoading={isLoading}
        />
    )
}

export default BookFeed

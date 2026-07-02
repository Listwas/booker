import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import styles from './BookFeed.module.css'
import BookCard from '../../components/BookCard.tsx'
import BookCardSkeleton from '../../components/BookCardSkeleton.tsx'
import { useAuth } from '../../context/AuthContext'
import { apiGenre, apiRecommendations } from '../../lib/api'
import type { OpenLibraryBook } from '../../lib/types'

const SCROLL_AMOUNT = 196 * 4
const LOOP_MIN = 7

interface FeedRowProps {
    header: string
    sub?: string
    books: OpenLibraryBook[]
    isLoading: boolean
}

// rows loop seamlessly: the list is rendered three times, the view starts
// on the middle copy and silently shifts by one copy width near the edges
function FeedRow({ header, sub, books, isLoading }: FeedRowProps) {
    const ref = useRef<HTMLDivElement>(null)
    const looped = books.length >= LOOP_MIN
    const display = looped ? [...books, ...books, ...books] : books

    const jumpBy = (el: HTMLDivElement, delta: number) => {
        el.style.scrollBehavior = "auto"
        el.scrollLeft += delta
        el.style.scrollBehavior = ""
    }

    useEffect(() => {
        const el = ref.current
        if (!looped || !el) return
        jumpBy(el, el.scrollWidth / 3 - el.scrollLeft)
    }, [looped, books.length])

    const handleScroll = () => {
        const el = ref.current
        if (!looped || !el) return
        const copy = el.scrollWidth / 3
        if (el.scrollLeft < copy * 0.5) jumpBy(el, copy)
        else if (el.scrollLeft > copy * 1.5) jumpBy(el, -copy)
    }

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

                <div className={styles.cards_row} ref={ref} onScroll={handleScroll}>
                    {isLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div className={styles.card_wrap} key={i}>
                                <BookCardSkeleton />
                            </div>
                        ))
                        : display.map((b, i) => (
                            <div className={styles.card_wrap} key={`${b.work_id}-${i}`}>
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

import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import styles from './BookFeed.module.css'
import BookCard from '../../components/BookCard.tsx'
import BookCardSkeleton from '../../components/BookCardSkeleton.tsx'
import { apiGenre } from '../../lib/api'

interface BookFeedProps {
    header?: string
    genre: string
}

const SCROLL_AMOUNT = 196 * 4

function BookFeed({ header, genre }: BookFeedProps) {
    const ref = useRef<HTMLDivElement>(null)

    const { data, isLoading } = useQuery({
        queryKey: ["genre", genre],
        queryFn: () => apiGenre(genre),
        staleTime: 30 * 60 * 1000,
    })

    const books = data?.books ?? []

    const scroll = (dir: number) => {
        ref.current?.scrollBy({ left: SCROLL_AMOUNT * dir, behavior: "smooth" })
    }

    return (
        <div className={styles.feed_block}>
            <h2>{header ?? genre.replace(/-/g, " ")}</h2>
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

export default BookFeed
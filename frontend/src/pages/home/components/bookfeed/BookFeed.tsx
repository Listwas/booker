import { useEffect, useState, useRef } from 'react'
import styles from './bookfeed.module.css'
import BookCard from '../../../../components/BookCard.tsx'
import BookCardSkeleton from '../../../../components/BookCardSkeleton.tsx'

interface Book {
    title: string
    author: string
    cover: string
    work_id: string
}

const SCROLL_AMOUNT = 216 * 4

function BookFeed({ header, genre }: { header?: string; genre: string }) {
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(true)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const cacheKey = `books_${genre}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            const { data, ts } = JSON.parse(cached)
            if (Date.now() - ts < 10 * 60 * 1000) {
                setBooks(data)
                setLoading(false)
                return
            }
        }
        fetch(`http://127.0.0.1:8000/books/${genre}`)
            .then(r => r.json())
            .then(d => {
                setBooks(d.books)
                localStorage.setItem(cacheKey, JSON.stringify({ data: d.books, ts: Date.now() }))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
        }, [genre])

    const scroll = (dir: number) => {
        ref.current?.scrollBy({ left: SCROLL_AMOUNT * dir, behavior: "smooth" })
    }

    return (
        <div className={styles.feed_block}>
            <h2>{header ?? genre}</h2>
            <div className={styles.carousel_wrapper}>
                <button className={`${styles.arrow} ${styles.arrow_left}`} onClick={() => scroll(-1)}>‹</button>

                <div className={styles.cards_row} ref={ref}>
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => <BookCardSkeleton key={i} />)
                        : books.map((b, i) => <BookCard key={i} title={b.title} author={b.author} cover={b.cover} workId={b.work_id}/>)
                    }
                </div>

                <button className={`${styles.arrow} ${styles.arrow_right}`} onClick={() => scroll(1)}>›</button>
            </div>
        </div>
    )
}

export default BookFeed
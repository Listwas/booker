import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Nav from '../home/components/nav/Nav'
import BookCard from '../home/components/bookfeed/BookCard'
import s from './search_page.module.css'

interface Book {
    title: string
    author: string
    cover: string
}

export default function SearchPage() {
    const [params] = useSearchParams()
    const q = params.get("q") ?? ""
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!q) return
        setLoading(true)
        fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => setBooks(d.books))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [q])

    return (
        <>
            <Nav />
            <div className={s.page}>
                <p className={s.heading}>
                    results for <span>"{q}"</span>
                </p>
                {loading
                    ? <p className={s.empty}>searching...</p>
                    : books.length === 0
                        ? <p className={s.empty}>nothing found</p>
                        : <div className={s.grid}>
                            {books.map((b, i) => (
                                <BookCard key={i} title={b.title} author={b.author} cover={b.cover} />
                            ))}
                        </div>
                }
            </div>
        </>
    )
}
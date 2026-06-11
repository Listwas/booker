import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './search.module.css'

interface Result {
    title: string
    author: string
    cover: string
}

function Search() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<Result[]>([])
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([])
            setOpen(false)
            return
        }
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(async () => {
            const res = await fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}&limit=5`)
            const data = await res.json()
            setResults(data.books)
            setOpen(true)
        }, 350)
    }, [query])

    const go = () => {
        if (!query.trim()) return
        setOpen(false)
        navigate(`/search?q=${encodeURIComponent(query)}`)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") go()
    }

    const handleResultClick = (title: string) => {
        setOpen(false)
        navigate(`/search?q=${encodeURIComponent(title)}`)
    }

    return (
        <div className={styles.search_container}>
            <div className={styles.input_row}>
                <input
                    className={styles.search}
                    type="text"
                    placeholder="search..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKey}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                />
                {query.length > 0 && (
                    <button className={styles.arrow_btn} onClick={go}>→</button>
                )}
            </div>

            {open && results.length > 0 && (
                <div className={styles.dropdown}>
                    {results.map((r, i) => (
                        <div key={i} className={styles.dropdown_item} onClick={() => handleResultClick(r.title)}>
                            <img className={styles.dropdown_cover} src={r.cover} alt={r.title} />
                            <div className={styles.dropdown_info}>
                                <span className={styles.dropdown_title}>{r.title}</span>
                                <span className={styles.dropdown_author}>{r.author}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Search
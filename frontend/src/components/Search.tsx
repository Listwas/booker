import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiSearch } from '../lib/api'
import styles from './Search.module.css'

function Search() {
    const [query, setQuery] = useState("")
    const [debounced, setDebounced] = useState("")
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setDebounced(query.trim()), 400)
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [query])

    const { data } = useQuery({
        queryKey: ["search", debounced],
        queryFn: () => apiSearch(debounced, 5),
        enabled: debounced.length >= 2,
        staleTime: 5 * 60 * 1000,
    })

    const results = data?.books ?? []

    const go = () => {
        if (!query.trim()) return
        setOpen(false)
        navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") go()
        if (e.key === "Escape") setOpen(false)
    }

    const handleResultClick = (workId: string) => {
        setOpen(false)
        setQuery("")
        navigate(`/book/${workId}`)
    }

    return (
        <div className={styles.search_container}>
            <div className={styles.input_row}>
                <input
                    className={styles.search}
                    type="text"
                    placeholder="search..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKey}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                />
                {query.length > 0 && (
                    <button className={styles.arrow_btn} onClick={go}>→</button>
                )}
            </div>

            {open && results.length > 0 && (
                <div className={styles.dropdown}>
                    {results.map((r) => (
                        <div
                            key={r.work_id}
                            className={styles.dropdown_item}
                            onClick={() => handleResultClick(r.work_id)}
                        >
                            <img className={styles.dropdown_cover} src={r.cover} alt="" />
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
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiSearch } from '../lib/api'
import { useLang } from '../lib/i18n'
import styles from './Search.module.css'

function Search() {
    const { t } = useLang()
    const [query, setQuery] = useState("")
    const [debounced, setDebounced] = useState("")
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(-1)
    const navigate = useNavigate()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setDebounced(query.trim()), 250)
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [query])

    const searching = query.trim().length >= 2

    const { data, isFetching } = useQuery({
        queryKey: ["search", debounced],
        queryFn: () => apiSearch(debounced, 5),
        enabled: debounced.length >= 2,
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
    })

    const results = data?.books ?? []
    // results may still belong to the previous query
    const stale = isFetching || debounced !== query.trim()

    const go = () => {
        if (!query.trim()) return
        setOpen(false)
        navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }

    const openBook = (workId: string) => {
        setOpen(false)
        setQuery("")
        setActive(-1)
        navigate(`/book/${workId}`)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown" && results.length > 0) {
            e.preventDefault()
            setOpen(true)
            setActive((a) => (a + 1) % results.length)
        } else if (e.key === "ArrowUp" && results.length > 0) {
            e.preventDefault()
            setActive((a) => (a <= 0 ? results.length - 1 : a - 1))
        } else if (e.key === "Enter") {
            if (open && active >= 0 && results[active]) openBook(results[active].work_id)
            else go()
        } else if (e.key === "Escape") {
            setOpen(false)
            setActive(-1)
        }
    }

    return (
        <div className={styles.search_container}>
            <input
                className={`${styles.search} ${isFetching ? styles.fetching : ""}`}
                type="text"
                placeholder={t("search_placeholder")}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                    setActive(-1)
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKey}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
            />

            {open && searching && (
                <div className={styles.dropdown}>
                    {results.length === 0 && (
                        <div className={styles.dropdown_status}>
                            {stale ? t("search_searching") : t("search_no_results")}
                        </div>
                    )}
                    {results.length > 0 && stale && (
                        <div className={styles.dropdown_status}>{t("search_searching")}</div>
                    )}
                    <div className={`${styles.dropdown_list} ${stale ? styles.dropdown_stale : ""}`}>
                    {results.map((r, i) => (
                        <div
                            key={r.work_id}
                            className={`${styles.dropdown_item} ${i === active ? styles.dropdown_active : ""}`}
                            // mousedown fires before the input blur
                            onMouseDown={(e) => {
                                e.preventDefault()
                                openBook(r.work_id)
                            }}
                            onMouseEnter={() => setActive(i)}
                        >
                            <img className={styles.dropdown_cover} src={r.cover} alt="" />
                            <div className={styles.dropdown_info}>
                                <span className={styles.dropdown_title}>{r.title}</span>
                                <span className={styles.dropdown_author}>{r.author}</span>
                            </div>
                        </div>
                    ))}
                    </div>
                    <div
                        className={styles.dropdown_all}
                        onMouseDown={(e) => {
                            e.preventDefault()
                            go()
                        }}
                    >
                        {t("search_all_results", { q: query.trim() })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Search

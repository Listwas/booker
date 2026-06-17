import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import styles from './BookCard.module.css'

interface BookCardProps {
    title: string
    author: string
    cover: string
    workId?: string
    hideAddButton?: boolean
}

function BookCard({ title, author, cover, workId, hideAddButton = false }: BookCardProps) {
    const { token, listIds, refreshListIds } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [added, setAdded] = useState(false)
    const [fetchingInfo, setFetchingInfo] = useState(false)

    useEffect(() => {
        if (!listIds) {
            setAdded(false)
            return
        }
        let exists = false
        if (workId) {
            exists = listIds.work_ids.includes(workId)
        } else {
            const t = title.toLowerCase()
            const a = author.toLowerCase()
            exists = listIds.titles.some((lt, i) =>
                lt.toLowerCase() === t &&
                (listIds.authors[i] ?? "").toLowerCase() === a
            )
        }
        setAdded(exists)
    }, [listIds, workId, title, author])

    const handleAdd = async () => {
        if (!token) {
            showToast("Please login to add books to your list")
            navigate("/auth", { state: { mode: "login" } })
            return
        }
        if (added) return

        let totalPages: number | null = null
        if (workId) {
            setFetchingInfo(true)
            showToast(`fetching book info...`)
            try {
                const metaRes = await fetch(`http://127.0.0.1:8000/book/${workId}/metadata`)
                if (metaRes.ok) {
                    const meta = await metaRes.json()
                    totalPages = meta.total_pages ?? null
                }
            } catch (e) {
                console.error(e)
            } finally {
                setFetchingInfo(false)
            }
        }

        const res = await fetch("http://127.0.0.1:8000/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                author,
                cover,
                status: "plan",
                rating: null,
                progress: null,
                total_pages: totalPages,
                work_id: workId || null
            })
        })
        if (res.ok) {
            setAdded(true)
            showToast(`"${title}" added to plan`)
            refreshListIds()
        } else {
            const err = await res.json()
            if (err.detail === "Book already in your list") {
                setAdded(true)
                showToast(`"${title}" is already in your list`)
                refreshListIds()
            }
        }
    }

    const handleCardClick = () => {
        if (workId) {
            navigate(`/book/${workId}`)
        } else {
            navigate(`/search?q=${encodeURIComponent(title)}`)
        }
    }

    return (
        <div className={styles.bookcard_container}>
            <div
                className={styles.cover_container}
                onClick={handleCardClick}
                style={{ cursor: "pointer" }}
            >
                <img src={cover} alt={title} />
            </div>

            <div className={styles.info_card}>
                <div className={styles.top_part}>
                    <span className={styles.star}>★</span>
                    <span className={styles.rating_score}>8.4</span>
                    <span className={styles.rating_count}>(2134)</span>
                    {!hideAddButton && (
                        <button
                            className={`${styles.add_btn} ${added ? styles.added : ""}`}
                            onClick={handleAdd}
                            disabled={fetchingInfo}
                            title={fetchingInfo ? "fetching book info..." : (added ? "added" : "add to list")}
                        >
                            {fetchingInfo ? "…" : (added ? "✓" : "+")}
                        </button>
                    )}
                </div>

                <div className={styles.bottom_part} onClick={handleCardClick} style={{ cursor: "pointer" }}>
                    <span className={styles.author}>{author}</span>
                    <p className={styles.title}>{title}</p>
                </div>
            </div>
        </div>
    )
}

export default BookCard
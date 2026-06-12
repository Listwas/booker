import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import styles from './bookcard.module.css'

interface BookCardProps {
    title: string
    author: string
    cover: string
    workId?: string
    hideAddButton?: boolean
}

function BookCard({ title, author, cover, workId, hideAddButton = false }: BookCardProps) {
    const { token } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [added, setAdded] = useState(false)

    useEffect(() => {
        if (!token || !workId) return
        fetch("http://127.0.0.1:8000/list?status=all", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(list => {
                const exists = list.some((book: any) =>
                    book.title.toLowerCase() === title.toLowerCase() &&
                    book.author.toLowerCase() === author.toLowerCase()
                )
                setAdded(exists)
            })
            .catch(console.error)
    }, [token, title, author, workId])

    const handleAdd = async () => {
        if (!token) {
            showToast("Please login to add books to your list")
            navigate("/auth", { state: { mode: "login" } })
            return
        }
        if (added) return
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
                total_pages: null,
                work_id: workId || null
            })
        })
        if (res.ok) {
            setAdded(true)
            showToast(`"${title}" added to plan`)
        } else {
            const err = await res.json()
            if (err.detail === "Book already in your list") {
                setAdded(true)
                showToast(`"${title}" is already in your list`)
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
                            title={added ? "added" : "add to list"}
                        >
                            {added ? "✓" : "+"}
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
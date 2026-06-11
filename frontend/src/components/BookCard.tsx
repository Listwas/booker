import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import styles from './bookcard.module.css'

interface BookCardProps {
    title: string
    author: string
    cover: string
    workId?: string
}

function BookCard({ title, author, cover, workId }: BookCardProps) {
    const { token } = useAuth()
    const { showToast } = useToast()
    const [added, setAdded] = useState(false)

    const handleAdd = async () => {
        if (!token || added) return
        const res = await fetch("http://127.0.0.1:8000/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title, author, cover, status: "plan", rating: null, progress: null })
        })
        if (res.ok) {
            setAdded(true)
            showToast(`"${title}" added to plan`)
        }
    }

    return (
        <div className={styles.bookcard_container}>
            <div className={styles.cover_container}>
                <img src={cover} alt={title} />
            </div>

            <div className={styles.info_card}>
                <div className={styles.top_part}>
                    <span className={styles.star}>★</span>
                    <span className={styles.rating_score}>8.4</span>
                    <span className={styles.rating_count}>(2134)</span>
                    <button
                        className={`${styles.add_btn} ${added ? styles.added : ""}`}
                        onClick={handleAdd}
                        title={added ? "added" : "add to list"}
                    >
                        {added ? "✓" : "+"}
                    </button>
                </div>

                <div className={styles.bottom_part}>
                    <span className={styles.author}>{author}</span>
                    <p className={styles.title}>{title}</p>
                </div>
            </div>
        </div>
    )
}

export default BookCard
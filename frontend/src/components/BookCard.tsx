import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiAddBook, apiBook, ApiError } from '../lib/api'
import type { OpenLibraryBook } from '../lib/types'
import StarRating from './StarRating'
import styles from './BookCard.module.css'

interface BookCardProps {
    book: OpenLibraryBook
    hideAddButton?: boolean
}

function BookCard({ book, hideAddButton = false }: BookCardProps) {
    const { title, author, cover, work_id, community } = book
    const { token, listIds } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [imgLoaded, setImgLoaded] = useState(false)

    const added = (() => {
        if (!listIds) return false
        if (work_id && listIds.work_ids.includes(work_id)) return true
        const t = title.toLowerCase()
        const a = author.toLowerCase()
        return listIds.titles.some(
            (lt, i) => lt.toLowerCase() === t && (listIds.authors[i] ?? "").toLowerCase() === a
        )
    })()

    const addMutation = useMutation({
        mutationFn: () =>
            apiAddBook(token!, {
                title,
                author,
                cover,
                status: "plan",
                rating: null,
                progress: null,
                total_pages: null,
                work_id,
            }),
        onSuccess: async () => {
            showToast(`"${title}" added to your library`)
            await qc.invalidateQueries({ queryKey: ["list"] })
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
            await qc.invalidateQueries({ queryKey: ["recommendations"] })
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 400 && err.message.includes("already")) {
                showToast(`"${title}" is already in your library`)
                qc.invalidateQueries({ queryKey: ["listIds"] })
                return
            }
            showToast(err instanceof Error ? err.message : "Failed to add book", "error")
        },
    })

    const handleAdd = () => {
        if (!token) {
            showToast("Please login to add books to your library")
            navigate("/auth", { state: { mode: "login" } })
            return
        }
        if (added) return
        addMutation.mutate()
    }

    const open = () => navigate(`/book/${work_id}`)

    // prefetch on hover so the book page opens instantly
    const prefetch = () => {
        if (!work_id) return
        qc.prefetchQuery({
            queryKey: ["book", work_id],
            queryFn: () => apiBook(work_id),
            staleTime: 60 * 60 * 1000,
        })
    }

    return (
        <div className={styles.bookcard_container} onMouseEnter={prefetch}>
            <div className={styles.cover_container} onClick={open}>
                <img
                    src={cover}
                    alt={`Cover of ${title}`}
                    loading="lazy"
                    onLoad={() => setImgLoaded(true)}
                    data-loaded={imgLoaded}
                    className="book-cover"
                />
            </div>

            <div className={styles.info_card}>
                <div className={styles.top_part}>
                    {community.rating != null ? (
                        <>
                            <StarRating value={community.rating} readonly size={13} />
                            <span className={styles.rating_score}>{community.rating.toFixed(1)}</span>
                            <span className={styles.rating_count}>
                                ({community.count.toLocaleString()})
                            </span>
                        </>
                    ) : (
                        <span className={styles.rating_count}>no ratings yet</span>
                    )}
                    {!hideAddButton && (
                        <button
                            className={`${styles.add_btn} ${added ? styles.added : ""}`}
                            onClick={handleAdd}
                            disabled={added || addMutation.isPending}
                            title={added ? "in your library" : "add to library"}
                        >
                            {addMutation.isPending ? "…" : added ? "✓" : "+"}
                        </button>
                    )}
                </div>

                <div className={styles.bottom_part} onClick={open}>
                    <span className={styles.author}>{author}</span>
                    <p className={styles.title}>{title}</p>
                </div>
            </div>
        </div>
    )
}

export default BookCard

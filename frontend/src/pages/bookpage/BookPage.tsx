import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import StarRating from "../../components/StarRating"
import { apiBook, apiAddBook, ApiError } from "../../lib/api"
import s from "./BookPage.module.css"

export default function BookPage() {
    const { workId } = useParams<{ workId: string }>()
    const { token, listIds } = useAuth()
    const { showToast } = useToast()
    const qc = useQueryClient()
    const [imgLoaded, setImgLoaded] = useState(false)

    const { data: book, isLoading, error } = useQuery({
        queryKey: ["book", workId],
        queryFn: () => apiBook(workId!),
        enabled: !!workId,
        staleTime: 60 * 60 * 1000,
        retry: 2,
    })

    const added = !!listIds && !!workId && listIds.work_ids.includes(workId)

    const addMutation = useMutation({
        mutationFn: () =>
            apiAddBook(token!, {
                title: book!.title,
                author: book!.authors[0] ?? "Unknown",
                cover: book!.cover,
                status: "plan",
                work_id: workId,
            }),
        onSuccess: async () => {
            showToast(`"${book!.title}" added to your library`)
            await qc.invalidateQueries({ queryKey: ["list"] })
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 400) {
                showToast(err.message)
                qc.invalidateQueries({ queryKey: ["listIds"] })
            } else {
                showToast("Failed to add book")
            }
        },
    })

    if (isLoading) {
        return (
            <>
                <Nav />
                <div className={s.page}>
                    <p className={s.loading}>loading…</p>
                </div>
                <Footer />
            </>
        )
    }

    if (error || !book) {
        return (
            <>
                <Nav />
                <div className={s.page}>
                    <Link to="/" className={s.back}>‹ back</Link>
                    <p className={s.loading}>
                        couldn't load this book. openlibrary might be slow, try again in a moment.
                    </p>
                </div>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Nav />
            <div className={s.page}>
                <Link to="/" className={s.back}>‹ back</Link>
                <div className={s.content}>
                    <div className={s.cover}>
                        {book.cover && (
                            <img
                                src={book.cover}
                                alt={`Cover of ${book.title}`}
                                onLoad={() => setImgLoaded(true)}
                                data-loaded={imgLoaded}
                                className="book-cover"
                            />
                        )}
                    </div>

                    <div className={s.info}>
                        <h1 className={s.title}>{book.title}</h1>
                        <p className={s.authors}>{book.authors.join(", ")}</p>

                        <div className={s.rating_row}>
                            <StarRating value={book.community.rating} readonly size={18} />
                            <span className={s.rating_label}>
                                {book.community.rating.toFixed(1)}
                            </span>
                            <span className={s.rating_count}>
                                {book.community.count.toLocaleString()} reviews
                            </span>
                        </div>

                        {book.first_publish_year && (
                            <p className={s.year}>first published: {book.first_publish_year}</p>
                        )}

                        {book.subjects.length > 0 && (
                            <div className={s.meta}>
                                {book.subjects.map((sub, i) => (
                                    <span key={i} className={s.subject_pill}>{sub}</span>
                                ))}
                            </div>
                        )}

                        {book.description && (
                            <p className={s.description}>{book.description}</p>
                        )}

                        {added ? (
                            <Link to="/list" className={s.added_link}>
                                ✓ already in your library, view list
                            </Link>
                        ) : (
                            <button
                                className={s.add_btn}
                                onClick={() => {
                                    if (!token) {
                                        showToast("Please login to add books")
                                        return
                                    }
                                    addMutation.mutate()
                                }}
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending
                                    ? "adding…"
                                    : token
                                    ? "add to library"
                                    : "login to add"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}
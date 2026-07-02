import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import StarRating from "../../components/StarRating"
import { apiBook, apiAddBook, apiList, apiPatchBook, ApiError, type BookPatch } from "../../lib/api"
import { STATUSES, STATUS_COLORS, type BookStatus, type UserBook } from "../../lib/types"
import s from "./BookPage.module.css"

const LIST_KEY = ["list", "all"] as const

export default function BookPage() {
    const { workId } = useParams<{ workId: string }>()
    const navigate = useNavigate()
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

    // the user's entry for this work, if it's in their list
    const { data: list } = useQuery({
        queryKey: LIST_KEY,
        queryFn: () => apiList(token!, "all"),
        enabled: !!token,
        staleTime: 30 * 1000,
    })
    const entry = list?.find((b) => b.work_id === workId)

    const added = !!entry || (!!listIds && !!workId && listIds.work_ids.includes(workId))

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
            await qc.invalidateQueries({ queryKey: ["recommendations"] })
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 400) {
                showToast(err.message)
                qc.invalidateQueries({ queryKey: ["listIds"] })
            } else {
                showToast("Failed to add book", "error")
            }
        },
    })

    const back = () => {
        if (window.history.length > 1) navigate(-1)
        else navigate("/")
    }

    if (isLoading) {
        return (
            <>
                <Nav />
                <div className={s.page}>
                    <button onClick={back} className={s.back}>‹ back</button>
                    <div className={s.content}>
                        <div className={`${s.cover} ${s.skeleton}`} />
                        <div className={s.info}>
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "60%", height: 32 }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "30%" }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "45%" }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "90%", height: 96 }} />
                        </div>
                    </div>
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
                    <button onClick={back} className={s.back}>‹ back</button>
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
                <button onClick={back} className={s.back}>‹ back</button>
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
                            {book.community.rating != null ? (
                                <>
                                    <StarRating value={book.community.rating} readonly size={18} />
                                    <span className={s.rating_label}>
                                        {book.community.rating.toFixed(1)}
                                    </span>
                                    <span className={s.rating_count}>
                                        {book.community.count.toLocaleString()}{" "}
                                        {book.community.count === 1 ? "rating" : "ratings"} from booker readers
                                    </span>
                                </>
                            ) : (
                                <span className={s.rating_count}>
                                    no ratings from booker readers yet
                                </span>
                            )}
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

                        {entry ? (
                            <UserEntryPanel entry={entry} token={token!} />
                        ) : added ? (
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

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
    })
}

function UserEntryPanel({ entry, token }: { entry: UserBook; token: string }) {
    const qc = useQueryClient()
    const { showToast } = useToast()
    const [draftNote, setDraftNote] = useState<string | null>(null)

    const noteValue = draftNote ?? entry.note ?? ""
    const noteDirty = draftNote != null && draftNote !== (entry.note ?? "")

    const patchMutation = useMutation({
        mutationFn: (body: BookPatch) => apiPatchBook(token, entry.id, body),
        onSuccess: (updated) => {
            qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: (err) => {
            showToast(err instanceof ApiError ? err.message : "Update failed", "error")
        },
    })

    const color = STATUS_COLORS[entry.status] ?? "#888"
    const started = formatDate(entry.started_at)
    const finished = formatDate(entry.finished_at)

    return (
        <div className={s.entry_panel}>
            <div className={s.entry_header}>
                <span className={s.entry_title}>your entry</span>
                <Link to="/list" className={s.entry_link}>view list ›</Link>
            </div>

            <div className={s.entry_row}>
                <select
                    className={s.entry_status}
                    value={entry.status}
                    style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}
                    onChange={(e) => patchMutation.mutate({ status: e.target.value as BookStatus })}
                >
                    {STATUSES.filter((st) => st.key !== "all").map((st) => (
                        <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                </select>

                <div className={s.entry_rating}>
                    <span className={s.entry_label}>my rating</span>
                    <StarRating
                        value={entry.rating}
                        size={16}
                        onChange={(v) =>
                            patchMutation.mutate(v === null ? { clear_rating: true } : { rating: v })
                        }
                    />
                </div>
            </div>

            {(started || finished) && (
                <p className={s.entry_dates}>
                    {started && <>started {started}</>}
                    {started && finished && " · "}
                    {finished && <>finished {finished}</>}
                </p>
            )}

            <textarea
                className={s.entry_note}
                placeholder="private notes about this book…"
                value={noteValue}
                rows={3}
                maxLength={2000}
                onChange={(e) => setDraftNote(e.target.value)}
            />
            {noteDirty && (
                <button
                    className={s.entry_save}
                    disabled={patchMutation.isPending}
                    onClick={() => {
                        patchMutation.mutate({ note: draftNote ?? "" })
                        setDraftNote(null)
                        showToast("note saved")
                    }}
                >
                    save note
                </button>
            )}
        </div>
    )
}

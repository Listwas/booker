import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import StarRating from "../../components/StarRating"
import AddCustomModal from "../../components/CustomAddModal"
import Nav, { Footer } from "../../components/Nav"
import {
    apiList,
    apiPatchBook,
    apiDeleteBook,
    apiReread,
    apiResetReread,
    apiBookMeta,
    apiDemo,
    ApiError,
} from "../../lib/api"
import { STATUSES, STATUS_COLORS, type BookStatus, type UserBook } from "../../lib/types"
import s from "./BookList.module.css"

const SORTS = [
    { key: "recent", label: "recently added" },
    { key: "title", label: "title a-z" },
    { key: "author", label: "author a-z" },
    { key: "rating", label: "rating" },
] as const

type SortKey = (typeof SORTS)[number]["key"]

function sortBooks(books: UserBook[], sort: SortKey): UserBook[] {
    const copy = [...books]
    switch (sort) {
        case "title":
            return copy.sort((a, b) => a.title.localeCompare(b.title))
        case "author":
            return copy.sort((a, b) => a.author.localeCompare(b.author))
        case "rating":
            return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        default:
            return copy.sort(
                (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0)
            )
    }
}

export default function BookList() {
    const { user, token, loading } = useAuth()
    const navigate = useNavigate()

    if (loading) {
        return (
            <>
                <Nav />
                <div className={s.loading}>loading your library…</div>
                <Footer />
            </>
        )
    }

    if (!user || !token) {
        return <GuestLibrary onCta={() => navigate("/auth", { state: { mode: "register" } })} />
    }

    return <UserLibrary token={token} />
}

function GuestLibrary({ onCta }: { onCta: () => void }) {
    const { data, isLoading } = useQuery({
        queryKey: ["demo"],
        queryFn: () => apiDemo(),
        staleTime: 60 * 60 * 1000,
    })

    const books = data?.books ?? []

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.guest_banner}>
                    <div className={s.guest_banner_text}>
                        <div className={s.guest_icon}>★</div>
                        <div>
                            <p className={s.guest_title}>You're browsing a demo library</p>
                            <p className={s.guest_sub}>
                                This is what a booker library looks like. Create a free account to
                                build your own, track reading, rate books, and keep a wishlist.
                            </p>
                        </div>
                    </div>
                    <button className={s.cta_btn} onClick={onCta}>create your library</button>
                </div>

                <div className={s.library_header}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--bg-dark-text-95)" }}>
                        demo_reader's library
                    </span>
                    <span className={s.readonly_badge}>read-only</span>
                </div>

                {isLoading ? (
                    <div className={s.loading}>loading demo…</div>
                ) : (
                    <div className={s.table_scroll}>
                        <div className={s.table}>
                            <div className={s.table_header}>
                                <span />
                                <span>book</span>
                                <span>rating</span>
                                <span>pages</span>
                                <span>status</span>
                                <span />
                            </div>
                            {books.map((b) => {
                                const color = STATUS_COLORS[b.status as BookStatus] ?? "#888"
                                return (
                                    <div className={s.table_row} key={b.id}>
                                        <img className={s.cover} src={b.cover} alt={b.title} />
                                        <div>
                                            <span className={s.book_title}>{b.title}</span>
                                            <span className={s.book_author}>{b.author}</span>
                                            {b.rereads > 0 && (
                                                <span className={s.reread_badge}>reread #{b.rereads}</span>
                                            )}
                                        </div>
                                        <StarRating value={b.rating} readonly size={14} />
                                        <span style={{ fontSize: "0.8rem", color: "var(--bg-dark-text-70)" }}>
                                            {b.progress ?? 0} / {b.total_pages ?? "?"}
                                        </span>
                                        <span
                                            style={{
                                                backgroundColor: `${color}20`,
                                                color,
                                                padding: "4px 10px",
                                                borderRadius: "999px",
                                                fontSize: "0.75rem",
                                                fontWeight: 500,
                                                display: "inline-block",
                                                width: "fit-content",
                                            }}
                                        >
                                            {b.status}
                                        </span>
                                        <span />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    )
}

function UserLibrary({ token }: { token: string }) {
    const qc = useQueryClient()
    const { showToast } = useToast()
    const [status, setStatus] = useState<BookStatus | "all">("all")
    const [sort, setSort] = useState<SortKey>("recent")
    const [showModal, setShowModal] = useState(false)
    const fetchedPagesRef = useRef<Set<number>>(new Set())

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["list", status],
        queryFn: () => apiList(token, status),
        staleTime: 30 * 1000,
    })

    const books = sortBooks(data ?? [], sort)

    useEffect(() => {
        if (!data) return
        const needing = data.filter(
            (b) => b.work_id && b.total_pages == null && !fetchedPagesRef.current.has(b.id)
        )
        if (needing.length === 0) return

        let cancelled = false
        ;(async () => {
            await Promise.allSettled(
                needing.map(async (b) => {
                    fetchedPagesRef.current.add(b.id)
                    try {
                        const meta = await apiBookMeta(b.work_id!)
                        if (cancelled) return
                        if (meta.total_pages) {
                            await apiPatchBook(token, b.id, { total_pages: meta.total_pages })
                        }
                    } catch {
                        // leave as unknown
                    }
                })
            )
            if (!cancelled) {
                await qc.invalidateQueries({ queryKey: ["list"] })
            }
        })()
        return () => {
            cancelled = true
        }
    }, [data, token, qc])

    const patchMutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: Partial<UserBook> }) =>
            apiPatchBook(token, id, body),
        onSuccess: async (updated) => {
            qc.setQueryData<UserBook[]>(["list", status], (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            await qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: (err) => {
            showToast(err instanceof ApiError ? err.message : "Update failed")
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDeleteBook(token, id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: ["list", status] })
            const prev = qc.getQueryData<UserBook[]>(["list", status])
            qc.setQueryData<UserBook[]>(["list", status], (old) =>
                old ? old.filter((b) => b.id !== id) : []
            )
            return { prev }
        },
        onError: (_e, _id, ctx) => {
            if (ctx?.prev) qc.setQueryData(["list", status], ctx.prev)
            showToast("Failed to remove book")
        },
        onSuccess: async () => {
            showToast("book removed")
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
        },
    })

    const rereadMutation = useMutation({
        mutationFn: (id: number) => apiReread(token, id),
        onSuccess: async (updated) => {
            qc.setQueryData<UserBook[]>(["list", status], (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            await qc.invalidateQueries({ queryKey: ["profile"] })
        },
    })

    const resetRereadMutation = useMutation({
        mutationFn: (id: number) => apiResetReread(token, id),
        onSuccess: async (updated) => {
            qc.setQueryData<UserBook[]>(["list", status], (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            await qc.invalidateQueries({ queryKey: ["profile"] })
        },
    })

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.bar}>
                    <div className={s.filter_bar}>
                        {STATUSES.map((st) => {
                            const active = status === st.key
                            return (
                                <button
                                    key={st.key}
                                    className={`${s.filter_btn} ${active ? s.active : ""}`}
                                    onClick={() => setStatus(st.key)}
                                    style={
                                        active && st.key !== "all"
                                            ? {
                                                backgroundColor: `${st.color}20`,
                                                borderColor: st.color,
                                                color: st.color,
                                            }
                                            : undefined
                                    }
                                >
                                    {st.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className={s.sort_bar}>
                        <span className={s.sort_label}>sort by</span>
                        <select
                            className={s.sort_select}
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortKey)}
                        >
                            {SORTS.map((o) => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                        </select>
                        <button
                            className={s.refresh_btn}
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title="Refresh library"
                        >
                            <span className={isFetching ? s.spin : ""}>↻</span>
                            <span style={{ display: "inline" }}>refresh</span>
                        </button>
                        <button className={s.add_btn} onClick={() => setShowModal(true)}>
                            + add custom
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className={s.loading}>loading your library…</div>
                ) : books.length === 0 ? (
                    <div className={s.empty}>
                        {status === "all"
                            ? "your library is empty, add some books from the home page"
                            : `no books in "${status}" yet`}
                    </div>
                ) : (
                    <EditableTable
                        books={books}
                        onPatch={(id, body, msg) => {
                            patchMutation.mutate({ id, body })
                            if (msg) showToast(msg)
                        }}
                        onDelete={(id, title) => {
                            deleteMutation.mutate(id)
                            showToast(`"${title}" removed`)
                        }}
                        onReread={(id, title) => {
                            rereadMutation.mutate(id)
                            showToast(`"${title}" reread started`)
                        }}
                        onResetReread={(id, title) => {
                            resetRereadMutation.mutate(id)
                            showToast(`"${title}" reread count reset`)
                        }}
                    />
                )}
            </div>

            {showModal && (
                <AddCustomModal
                    onClose={() => setShowModal(false)}
                    onAdded={() => {
                        /* invalidation handled inside the modal */
                    }}
                />
            )}
            <Footer />
        </>
    )
}

interface EditableTableProps {
    books: UserBook[]
    onPatch: (id: number, body: Partial<UserBook>, msg?: string) => void
    onDelete: (id: number, title: string) => void
    onReread: (id: number, title: string) => void
    onResetReread: (id: number, title: string) => void
}

function EditableTable({ books, onPatch, onDelete, onReread, onResetReread }: EditableTableProps) {
    const navigate = useNavigate()
    const [confirmReread, setConfirmReread] = useState<number | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

    return (
        <div className={s.table_scroll}>
            <div className={s.table}>
                <div className={s.table_header}>
                    <span />
                    <span>book</span>
                    <span>rating</span>
                    <span>pages</span>
                    <span>status</span>
                    <span style={{ textAlign: "right" }}>actions</span>
                </div>

                {books.map((b) => (
                    <LibraryRow
                        key={b.id}
                        book={b}
                        onPatch={onPatch}
                        onDelete={onDelete}
                        onReread={onReread}
                        onResetReread={onResetReread}
                        confirmReread={confirmReread === b.id}
                        setConfirmReread={(v) => setConfirmReread(v ? b.id : null)}
                        confirmDelete={confirmDelete === b.id}
                        setConfirmDelete={(v) => setConfirmDelete(v ? b.id : null)}
                        onOpen={() => {
                            if (b.work_id) navigate(`/book/${b.work_id}`)
                            else navigate(`/search?q=${encodeURIComponent(b.title)}`)
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

interface LibraryRowProps {
    book: UserBook
    onPatch: (id: number, body: Partial<UserBook>, msg?: string) => void
    onDelete: (id: number, title: string) => void
    onReread: (id: number, title: string) => void
    onResetReread: (id: number, title: string) => void
    confirmReread: boolean
    setConfirmReread: (v: boolean) => void
    confirmDelete: boolean
    setConfirmDelete: (v: boolean) => void
    onOpen: () => void
}

function LibraryRow({
    book,
    onPatch,
    onDelete,
    onReread,
    onResetReread,
    confirmReread,
    setConfirmReread,
    confirmDelete,
    setConfirmDelete,
    onOpen,
}: LibraryRowProps) {
    const [draftRead, setDraftRead] = useState<string | null>(null)
    const [draftTotal, setDraftTotal] = useState<string | null>(null)

    const readValue = draftRead ?? (book.progress != null ? String(book.progress) : "")
    const totalValue = draftTotal ?? (book.total_pages != null ? String(book.total_pages) : "")
    const dirty = draftRead != null || draftTotal != null

    const save = () => {
        const body: Partial<UserBook> = {}
        if (draftRead != null) {
            const n = parseInt(draftRead, 10)
            body.progress = isNaN(n) ? null : Math.max(0, n)
        }
        if (draftTotal != null) {
            const n = parseInt(draftTotal, 10)
            body.total_pages = isNaN(n) ? null : Math.max(0, n)
        }
        onPatch(book.id, body)
        setDraftRead(null)
        setDraftTotal(null)
    }

    const color = STATUS_COLORS[book.status as BookStatus] ?? "#888"

    return (
        <div className={s.table_row}>
            <img className={s.cover} src={book.cover} alt={book.title} onClick={onOpen} />

            <div>
                <button className={s.book_title} onClick={onOpen}>{book.title}</button>
                <span className={s.book_author}>{book.author}</span>
                {book.rereads > 0 && (
                    <span className={s.reread_badge}>reread #{book.rereads}</span>
                )}
            </div>

            <StarRating
                value={book.rating}
                onChange={(v) => onPatch(book.id, { rating: book.rating === v ? null : v })}
                size={14}
            />

            <div style={{ display: "flex", alignItems: "center" }}>
                <div className={s.pages_group}>
                    <input
                        className={`${s.page_input} clean-number`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={readValue}
                        onChange={(e) => setDraftRead(e.target.value)}
                        placeholder="read"
                        aria-label="Pages read"
                    />
                    <span className={s.page_sep}>/</span>
                    <input
                        className={`${s.page_input} clean-number`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={totalValue}
                        onChange={(e) => setDraftTotal(e.target.value)}
                        placeholder="total"
                        aria-label="Total pages"
                    />
                </div>
                {dirty && (
                    <button className={s.save_btn} onClick={save} aria-label="Save pages">✓</button>
                )}
            </div>

            <select
                className={s.status_select}
                value={book.status}
                style={{
                    backgroundColor: `${color}20`,
                    color,
                    borderColor: `${color}40`,
                }}
                onChange={(e) => {
                    const newStatus = e.target.value as BookStatus
                    const label = STATUSES.find((st) => st.key === newStatus)?.label ?? newStatus
                    onPatch(book.id, { status: newStatus }, `status changed to ${label}`)
                }}
            >
                {STATUSES.filter((st) => st.key !== "all").map((st) => (
                    <option key={st.key} value={st.key}>{st.label}</option>
                ))}
            </select>

            <div className={s.col_actions}>
                {confirmReread ? (
                    <div className={s.confirm_group}>
                        <button
                            className={s.confirm_yes}
                            onClick={() => {
                                onReread(book.id, book.title)
                                setConfirmReread(false)
                            }}
                        >
                            yes
                        </button>
                        <button className={s.confirm_no} onClick={() => setConfirmReread(false)}>
                            no
                        </button>
                    </div>
                ) : (
                    <button
                        className={s.reread_btn}
                        onClick={() => setConfirmReread(true)}
                        title="start reread"
                    >
                        ⟳
                    </button>
                )}
                {book.rereads > 0 && !confirmReread && (
                    <button
                        className={s.reset_btn}
                        onClick={() => onResetReread(book.id, book.title)}
                        title="reset reread count"
                    >
                        ↺
                    </button>
                )}
                {confirmDelete ? (
                    <div className={s.confirm_group}>
                        <button
                            className={s.confirm_yes}
                            onClick={() => {
                                onDelete(book.id, book.title)
                                setConfirmDelete(false)
                            }}
                        >
                            yes
                        </button>
                        <button className={s.confirm_no} onClick={() => setConfirmDelete(false)}>
                            no
                        </button>
                    </div>
                ) : (
                    <button
                        className={s.delete_btn}
                        onClick={() => setConfirmDelete(true)}
                        title="remove"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    )
}

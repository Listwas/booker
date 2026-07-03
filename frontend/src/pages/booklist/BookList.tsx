import { useState } from "react"
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
    apiDemo,
    ApiError,
    type BookPatch,
} from "../../lib/api"
import { useLang, type TKey } from "../../lib/i18n"
import { SORTS, sortBooks, type SortKey } from "../../lib/sort"
import { STATUSES, STATUS_COLORS, type BookStatus, type UserBook } from "../../lib/types"
import s from "./BookList.module.css"

const LIST_KEY = ["list", "all"] as const

// custom books often have no cover url, show the initial instead
function Cover({ cover, title, onClick }: { cover: string; title: string; onClick?: () => void }) {
    if (!cover) {
        return (
            <div className={`${s.cover} ${s.cover_fallback}`} onClick={onClick}>
                {title.slice(0, 1).toUpperCase()}
            </div>
        )
    }
    return <img className={s.cover} src={cover} alt={title} onClick={onClick} />
}

export default function BookList() {
    const { user, token, loading } = useAuth()
    const { t } = useLang()
    const navigate = useNavigate()

    if (loading) {
        return (
            <>
                <Nav />
                <div className={s.loading}>{t("list_loading")}</div>
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
    const { t } = useLang()
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
                            <p className={s.guest_title}>{t("guest_title")}</p>
                            <p className={s.guest_sub}>{t("guest_sub")}</p>
                        </div>
                    </div>
                    <button className={s.cta_btn} onClick={onCta}>{t("guest_cta")}</button>
                </div>

                <div className={s.library_header}>
                    <span className={s.library_owner}>{t("guest_owner")}</span>
                    <span className={s.readonly_badge}>{t("guest_readonly")}</span>
                </div>

                {isLoading ? (
                    <div className={s.loading}>{t("list_loading_demo")}</div>
                ) : (
                    <div className={s.table_scroll}>
                        <div className={s.table}>
                            <div className={s.table_header}>
                                <span />
                                <span>{t("col_book")}</span>
                                <span>{t("col_rating")}</span>
                                <span>{t("col_pages")}</span>
                                <span>{t("col_status")}</span>
                                <span />
                            </div>
                            {books.map((b) => {
                                const color = STATUS_COLORS[b.status as BookStatus] ?? "#888"
                                return (
                                    <div className={s.table_row} key={b.id}>
                                        <Cover cover={b.cover} title={b.title} />
                                        <div>
                                            <span className={s.book_title}>{b.title}</span>
                                            <span className={s.book_author}>{b.author}</span>
                                            {b.rereads > 0 && (
                                                <span className={s.reread_badge}>{t("reread_badge", { n: b.rereads })}</span>
                                            )}
                                        </div>
                                        <StarRating value={b.rating} readonly size={14} />
                                        <span className={s.pages_static}>
                                            {b.progress ?? 0} / {b.total_pages ?? "?"}
                                        </span>
                                        <span
                                            className={s.status_pill}
                                            style={{ backgroundColor: `${color}20`, color }}
                                        >
                                            {t(`status_${b.status}` as TKey)}
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
    const { t, te } = useLang()
    const { showToast } = useToast()
    const [status, setStatus] = useState<BookStatus | "all">("all")
    const [sort, setSort] = useState<SortKey>("recent")
    const [showModal, setShowModal] = useState(false)

    // fetch once, filter/sort client-side so switching tabs is instant
    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: LIST_KEY,
        queryFn: () => apiList(token, "all"),
        staleTime: 30 * 1000,
    })

    const all = data ?? []
    const filtered = status === "all" ? all : all.filter((b) => b.status === status)
    const books = sortBooks(filtered, sort)

    const counts = all.reduce<Record<string, number>>((acc, b) => {
        acc[b.status] = (acc[b.status] ?? 0) + 1
        return acc
    }, { all: all.length })

    const setBook = (updated: UserBook) => {
        qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
            old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
        )
    }

    const patchMutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: BookPatch }) =>
            apiPatchBook(token, id, body),
        // optimistic update, rolled back on error
        onMutate: async ({ id, body }) => {
            await qc.cancelQueries({ queryKey: LIST_KEY })
            const prev = qc.getQueryData<UserBook[]>(LIST_KEY)
            qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
                old?.map((b) => {
                    if (b.id !== id) return b
                    const { clear_rating, ...rest } = body
                    return { ...b, ...rest, ...(clear_rating ? { rating: null } : {}) }
                })
            )
            return { prev }
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(LIST_KEY, ctx.prev)
            showToast(err instanceof ApiError ? te(err.message) : t("toast_update_failed"), "error")
        },
        onSuccess: (updated) => {
            setBook(updated)
            qc.invalidateQueries({ queryKey: ["profile"] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDeleteBook(token, id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: LIST_KEY })
            const prev = qc.getQueryData<UserBook[]>(LIST_KEY)
            qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
                old ? old.filter((b) => b.id !== id) : []
            )
            return { prev }
        },
        onError: (_e, _id, ctx) => {
            if (ctx?.prev) qc.setQueryData(LIST_KEY, ctx.prev)
            showToast(t("toast_remove_failed"), "error")
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
            await qc.invalidateQueries({ queryKey: ["recommendations"] })
        },
    })

    const rereadMutation = useMutation({
        mutationFn: (id: number) => apiReread(token, id),
        onSuccess: (updated) => {
            setBook(updated)
            qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: () => showToast(t("toast_reread_failed"), "error"),
    })

    const resetRereadMutation = useMutation({
        mutationFn: (id: number) => apiResetReread(token, id),
        onSuccess: (updated) => {
            setBook(updated)
            qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: () => showToast(t("toast_reset_failed"), "error"),
    })

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.bar}>
                    <div className={s.filter_bar}>
                        {STATUSES.map((st) => {
                            const active = status === st.key
                            const count = counts[st.key] ?? 0
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
                                    {t(`status_${st.key}` as TKey)}{count > 0 ? ` ${count}` : ""}
                                </button>
                            )
                        })}
                    </div>

                    <div className={s.sort_bar}>
                        <span className={s.sort_label}>{t("sort_by")}</span>
                        <select
                            className={s.sort_select}
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortKey)}
                        >
                            {SORTS.map((o) => (
                                <option key={o.key} value={o.key}>{t(`sort_${o.key}` as TKey)}</option>
                            ))}
                        </select>
                        <button
                            className={s.refresh_btn}
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title={t("refresh")}
                        >
                            <span className={isFetching ? s.spin : ""}>↻</span>
                            <span>{t("refresh")}</span>
                        </button>
                        <button className={s.add_btn} onClick={() => setShowModal(true)}>
                            {t("add_custom")}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className={s.loading}>{t("list_loading")}</div>
                ) : books.length === 0 ? (
                    <div className={s.empty}>
                        {status === "all"
                            ? t("list_empty_all")
                            : t("list_empty_status", { status: t(`status_${status}` as TKey) })}
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
                            showToast(t("toast_removed", { title }))
                        }}
                        onReread={(id, title) => {
                            rereadMutation.mutate(id)
                            showToast(t("toast_reread", { title }))
                        }}
                        onResetReread={(id, title) => {
                            resetRereadMutation.mutate(id)
                            showToast(t("toast_reread_reset", { title }))
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
    onPatch: (id: number, body: BookPatch, msg?: string) => void
    onDelete: (id: number, title: string) => void
    onReread: (id: number, title: string) => void
    onResetReread: (id: number, title: string) => void
}

function EditableTable({ books, onPatch, onDelete, onReread, onResetReread }: EditableTableProps) {
    const { t } = useLang()
    const navigate = useNavigate()
    const [confirmReread, setConfirmReread] = useState<number | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

    return (
        <div className={s.table_scroll}>
            <div className={s.table}>
                <div className={s.table_header}>
                    <span />
                    <span>{t("col_book")}</span>
                    <span>{t("col_rating")}</span>
                    <span>{t("col_pages")}</span>
                    <span>{t("col_status")}</span>
                    <span className={s.head_right}>{t("col_actions")}</span>
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
    onPatch: (id: number, body: BookPatch, msg?: string) => void
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
    const { t } = useLang()
    const [draftRead, setDraftRead] = useState<string | null>(null)
    const [draftTotal, setDraftTotal] = useState<string | null>(null)

    const readValue = draftRead ?? (book.progress != null ? String(book.progress) : "")
    const totalValue = draftTotal ?? (book.total_pages != null ? String(book.total_pages) : "")
    const dirty = draftRead != null || draftTotal != null

    const save = () => {
        const body: BookPatch = {}
        if (draftRead != null) {
            const n = parseInt(draftRead, 10)
            body.progress = isNaN(n) ? null : Math.max(0, n)
        }
        if (draftTotal != null) {
            const n = parseInt(draftTotal, 10)
            body.total_pages = isNaN(n) || n < 1 ? null : n
        }
        onPatch(book.id, body)
        setDraftRead(null)
        setDraftTotal(null)
    }

    // enter saves the drafts, escape throws them away
    const handlePagesKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && dirty) save()
        if (e.key === "Escape") {
            setDraftRead(null)
            setDraftTotal(null)
        }
    }

    const color = STATUS_COLORS[book.status as BookStatus] ?? "#888"

    return (
        <div className={s.table_row}>
            <Cover cover={book.cover} title={book.title} onClick={onOpen} />

            <div>
                <button className={s.book_title} onClick={onOpen}>{book.title}</button>
                <span className={s.book_author}>{book.author}</span>
                {book.rereads > 0 && (
                    <span className={s.reread_badge}>{t("reread_badge", { n: book.rereads })}</span>
                )}
            </div>

            <StarRating
                value={book.rating}
                onChange={(v) => onPatch(book.id, v === null ? { clear_rating: true } : { rating: v })}
                size={14}
            />

            <div className={s.pages_cell}>
                <div className={s.pages_group}>
                    <input
                        className={`${s.page_input} clean-number`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={readValue}
                        onChange={(e) => setDraftRead(e.target.value)}
                        onKeyDown={handlePagesKey}
                        placeholder={t("pages_read_ph")}
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
                        onKeyDown={handlePagesKey}
                        placeholder={t("pages_total_ph")}
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
                    const label = t(`status_${newStatus}` as TKey)
                    onPatch(book.id, { status: newStatus }, t("toast_status_changed", { status: label }))
                }}
            >
                {STATUSES.filter((st) => st.key !== "all").map((st) => (
                    <option key={st.key} value={st.key}>{t(`status_${st.key}` as TKey)}</option>
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
                            {t("confirm_yes")}
                        </button>
                        <button className={s.confirm_no} onClick={() => setConfirmReread(false)}>
                            {t("confirm_no")}
                        </button>
                    </div>
                ) : (
                    <button
                        className={s.reread_btn}
                        onClick={() => setConfirmReread(true)}
                        title={t("title_reread")}
                    >
                        ⟳
                    </button>
                )}
                {book.rereads > 0 && !confirmReread && (
                    <button
                        className={s.reset_btn}
                        onClick={() => onResetReread(book.id, book.title)}
                        title={t("title_reset_reread")}
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
                            {t("confirm_yes")}
                        </button>
                        <button className={s.confirm_no} onClick={() => setConfirmDelete(false)}>
                            {t("confirm_no")}
                        </button>
                    </div>
                ) : (
                    <button
                        className={s.delete_btn}
                        onClick={() => setConfirmDelete(true)}
                        title={t("title_remove")}
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    )
}

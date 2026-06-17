import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import StarRating from "../../components/StarRating"
import AddCustomModal from "../../components/CustomAddModal"
import Nav from "../home/components/nav/Nav"
import s from "./booklist.module.css"

interface Book {
    id: number
    title: string
    author: string
    cover: string
    status: string
    rating: number | null
    progress: number | null
    total_pages: number | null
    rereads: number
    work_id: string | null
}

const STATUSES = [
    { key: "all", label: "all", color: "" },
    { key: "reading", label: "reading", color: "#3b82f6" },
    { key: "plan", label: "plan", color: "#6b7280" },
    { key: "completed", label: "completed", color: "#22c55e" },
    { key: "dropped", label: "dropped", color: "#ef4444" },
    { key: "hold", label: "hold", color: "#f59e0b" },
]
const SORTS = ["recently added", "title a-z", "author a-z", "rating"]

export default function BookList() {
    const { token } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [rawBooks, setRawBooks] = useState<Book[]>([])
    const [books, setBooks] = useState<Book[]>([])
    const [status, setStatus] = useState("plan")
    const [sort, setSort] = useState("recently added")
    const [showModal, setShowModal] = useState(false)
    const [savingPages, setSavingPages] = useState<number | null>(null)
    const [pendingProgress, setPendingProgress] = useState<{ id: number; value: number } | null>(null)
    const [pendingTotal, setPendingTotal] = useState<{ id: number; value: number } | null>(null)
    const [showRereadConfirm, setShowRereadConfirm] = useState<number | null>(null)

    const fetchList = () => {
        if (!token) return
        fetch(`http://127.0.0.1:8000/list?status=${status === "all" ? "all" : status}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setRawBooks)
            .catch(console.error)
    }

    useEffect(() => {
        if (!token) { navigate("/auth"); return }
        fetchList()
    }, [token, status])

    useEffect(() => {
        const sorted = [...rawBooks]
        if (sort === "title a-z") {
            sorted.sort((a, b) => a.title.localeCompare(b.title))
        } else if (sort === "author a-z") {
            sorted.sort((a, b) => a.author.localeCompare(b.author))
        } else if (sort === "rating") {
            sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        }
        setBooks(sorted)
    }, [rawBooks, sort])

    const patch = async (id: number, data: Partial<Book>, showStatusToast: boolean = false, oldStatus?: string) => {
        const res = await fetch(`http://127.0.0.1:8000/list/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })
        if (res.ok) {
            const updated = await res.json()
            setRawBooks(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b))
            if (showStatusToast && data.status && oldStatus && data.status !== oldStatus) {
                const statusLabel = STATUSES.find(s => s.key === data.status)?.label || data.status
                showToast(`Status changed to ${statusLabel}`)
            }
            return true
        } else {
            const err = await res.json()
            showToast(err.detail || "Update failed")
            return false
        }
    }

    const updateStatus = async (id: number, newStatus: string, book: Book) => {
        const oldStatus = book.status
        let updates: Partial<Book> = { status: newStatus }
        
        if (newStatus === "completed" && book.total_pages) {
            updates.progress = book.total_pages
            showToast(`"${book.title}" completed! All ${book.total_pages} pages marked as read`)
        }
        
        await patch(id, updates, true, oldStatus)
    }

    const updateProgress = async (id: number, newProgress: number, book: Book) => {
        let updates: Partial<Book> = { progress: newProgress }
        
        if (newProgress > 0 && (book.status === "plan" || book.status === "hold")) {
            updates.status = "reading"
            showToast(`Progress added - status changed to reading`)
        }
        
        await patch(id, updates, false)
    }

    const remove = async (id: number, title: string) => {
        await fetch(`http://127.0.0.1:8000/list/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        })
        setRawBooks(prev => prev.filter(b => b.id !== id))
        showToast(`"${title}" removed`)
    }

    const handleReread = async (id: number, title: string) => {
        setShowRereadConfirm(null)
        const res = await fetch(`http://127.0.0.1:8000/list/${id}/reread`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
            const data = await res.json()
            setRawBooks(prev => prev.map(b =>
                b.id === id ? { ...b, rereads: data.rereads, progress: 0, status: "reading" } : b
            ))
            showToast(`"${title}" reread started`)
        }
    }

    const confirmProgress = async (id: number) => {
        if (!pendingProgress) return
        setSavingPages(id)
        const book = books.find(b => b.id === id)
        if (book) {
            await updateProgress(id, pendingProgress.value, book)
        }
        setSavingPages(null)
        setPendingProgress(null)
    }

    const confirmTotal = async (id: number) => {
        if (!pendingTotal) return
        setSavingPages(id)
        await patch(id, { total_pages: pendingTotal.value }, false)
        setSavingPages(null)
        setPendingTotal(null)
        
        const book = books.find(b => b.id === id)
        if (book?.status === "completed" && book.progress && pendingTotal.value && book.progress !== pendingTotal.value) {
            if (book.progress > pendingTotal.value) {
                showToast(`Warning: Read pages (${book.progress}) exceed new total (${pendingTotal.value})`)
            } else if (book.progress === pendingTotal.value) {
                showToast(`Total pages updated to ${pendingTotal.value}`)
            }
        }
    }

    const handleReadChange = (id: number, value: string) => {
        const num = parseInt(value) || 0
        const book = books.find(b => b.id === id)
        if (book?.total_pages && num > book.total_pages) {
            showToast(`Read pages cannot exceed ${book.total_pages}`)
            return
        }
        setPendingProgress({ id, value: num })
    }

    const handleTotalChange = (id: number, value: string) => {
        const num = parseInt(value) || 0
        const book = books.find(b => b.id === id)
        if (book?.progress && num < book.progress) {
            showToast(`Total pages cannot be less than read pages (${book.progress})`)
            return
        }
        setPendingTotal({ id, value: num })
    }

    const navigateToBook = (book: Book) => {
        if (book.work_id) {
            navigate(`/book/${book.work_id}`)
        } else {
            navigate(`/search?q=${encodeURIComponent(book.title)}`)
        }
    }

    const getStatusStyle = (statusKey: string) => {
        const status = STATUSES.find(s => s.key === statusKey)
        if (!status || statusKey === "all") return {}
        return {
            backgroundColor: `${status.color}20`,
            color: status.color,
            borderColor: `${status.color}40`,
        }
    }

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.bar}>
                    <div className={s.filter_bar}>
                        {STATUSES.map(st => (
                            <button
                                key={st.key}
                                className={`${s.filter_btn} ${status === st.key ? s.active : ""}`}
                                onClick={() => setStatus(st.key)}
                                style={status === st.key && st.key !== "all" ? { backgroundColor: `${st.color}20`, borderColor: st.color, color: st.color } : {}}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                    <div className={s.sort_bar}>
                        <span className={s.sort_label}>sort by</span>
                        <select
                            className={s.sort_select}
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                        >
                            {SORTS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button className={s.add_btn} onClick={() => setShowModal(true)}>+ add custom</button>
                    </div>
                </div>

                {books.length === 0 ? (
                    <p className={s.empty}>nothing here</p>
                ) : (
                    <div className={s.table}>
                        <div className={s.table_header}>
                            <div className={s.col_cover}></div>
                            <div className={s.col_title}>book</div>
                            <div className={s.col_rating}>rating</div>
                            <div className={s.col_pages}>pages</div>
                            <div className={s.col_status}>status</div>
                            <div className={s.col_actions}>actions</div>
                        </div>

                        {books.map(b => (
                            <div key={b.id} className={s.table_row}>
                                <div className={s.col_cover}>
                                    <img
                                        className={s.cover}
                                        src={b.cover}
                                        alt={b.title}
                                        onClick={() => navigateToBook(b)}
                                    />
                                </div>

                                <div className={s.col_title} onClick={() => navigateToBook(b)}>
                                    <span className={s.book_title}>{b.title}</span>
                                    <span className={s.book_author}>{b.author}</span>
                                    {b.rereads > 0 && (
                                        <span className={s.reread_badge}>reread #{b.rereads}</span>
                                    )}
                                </div>

                                <div className={s.col_rating}>
                                    <StarRating
                                        value={b.rating}
                                        onChange={v => patch(b.id, { rating: v }, false)}
                                    />
                                </div>

                                <div className={s.col_pages}>
                                    <div className={s.pages_group}>
                                        <input
                                            className={s.page_input}
                                            type="number"
                                            min={0}
                                            value={pendingProgress?.id === b.id ? pendingProgress.value : (b.progress ?? 0)}
                                            onChange={e => handleReadChange(b.id, e.target.value)}
                                            placeholder="read"
                                        />
                                        <span className={s.page_sep}>/</span>
                                        <input
                                            className={s.page_input}
                                            type="number"
                                            min={0}
                                            value={pendingTotal?.id === b.id ? pendingTotal.value : (b.total_pages ?? "")}
                                            onChange={e => handleTotalChange(b.id, e.target.value)}
                                            placeholder="total"
                                        />
                                        {(pendingProgress?.id === b.id || pendingTotal?.id === b.id) && (
                                            <button
                                                className={s.save_btn}
                                                onClick={() => {
                                                    if (pendingProgress?.id === b.id) confirmProgress(b.id)
                                                    if (pendingTotal?.id === b.id) confirmTotal(b.id)
                                                }}
                                                disabled={savingPages === b.id}
                                            >
                                                {savingPages === b.id ? "..." : "✓"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={s.col_status}>
                                    <select
                                        className={s.status_select}
                                        value={b.status}
                                        style={getStatusStyle(b.status)}
                                        onChange={e => updateStatus(b.id, e.target.value, b)}
                                    >
                                        {STATUSES.filter(s => s.key !== "all").map(st => (
                                            <option key={st.key} value={st.key}>{st.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className={s.col_actions}>
                                    {showRereadConfirm === b.id ? (
                                        <div className={s.confirm_group}>
                                            <button
                                                className={s.confirm_yes}
                                                onClick={() => handleReread(b.id, b.title)}
                                            >
                                                yes
                                            </button>
                                            <button
                                                className={s.confirm_no}
                                                onClick={() => setShowRereadConfirm(null)}
                                            >
                                                no
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className={s.reread_btn}
                                            onClick={() => setShowRereadConfirm(b.id)}
                                            title="start reread"
                                        >
                                            ⟳
                                        </button>
                                    )}
                                    <button
                                        className={s.delete_btn}
                                        onClick={() => remove(b.id, b.title)}
                                        title="remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <AddCustomModal
                    onClose={() => setShowModal(false)}
                    onAdded={fetchList}
                />
            )}
        </>
    )
}
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

const STATUSES = ["all", "reading", "plan", "completed", "dropped", "hold"]
const SORTS = ["recently added", "title a-z", "author a-z", "rating"]

export default function BookList() {
    const { token } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [books, setBooks] = useState<Book[]>([])
    const [status, setStatus] = useState("plan")
    const [sort, setSort] = useState("recently added")
    const [showModal, setShowModal] = useState(false)

    const fetchList = () => {
        if (!token) return
        fetch(`http://127.0.0.1:8000/list?status=${status}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setBooks)
            .catch(console.error)
    }

    useEffect(() => {
        if (!token) { navigate("/auth"); return }
        fetchList()
    }, [token, status])

    const patch = async (id: number, data: Partial<Book>) => {
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
            setBooks(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b))
        } else {
            const err = await res.json()
            showToast(err.detail || "Update failed")
        }
    }

    const remove = async (id: number, title: string) => {
        await fetch(`http://127.0.0.1:8000/list/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        })
        setBooks(prev => prev.filter(b => b.id !== id))
        showToast(`"${title}" removed`)
    }

    const handleReread = async (id: number, title: string) => {
        const res = await fetch(`http://127.0.0.1:8000/list/${id}/reread`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
            const data = await res.json()
            setBooks(prev => prev.map(b =>
                b.id === id ? { ...b, rereads: data.rereads, progress: 0, status: "reading" } : b
            ))
            showToast(`"${title}" reread started`)
        }
    }

    const handleReadChange = (id: number, value: string) => {
        const num = parseInt(value) || 0
        const book = books.find(b => b.id === id)
        if (book?.total_pages && num > book.total_pages) {
            showToast(`Read pages cannot exceed ${book.total_pages}`)
            return
        }
        patch(id, { progress: num })
    }

    const handleTotalChange = (id: number, value: string) => {
        const num = parseInt(value) || 0
        const book = books.find(b => b.id === id)
        if (book?.progress && num < book.progress) {
            showToast(`Total pages cannot be less than read pages (${book.progress})`)
            return
        }
        patch(id, { total_pages: num })
    }

    const navigateToBook = (book: Book) => {
        if (book.work_id) {
            navigate(`/book/${book.work_id}`)
        } else {
            navigate(`/search?q=${encodeURIComponent(book.title)}`)
        }
    }

    const sorted = [...books].sort((a, b) => {
        if (sort === "title a-z") return a.title.localeCompare(b.title)
        if (sort === "author a-z") return a.author.localeCompare(b.author)
        if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0)
        return 0
    })

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.page_header}>
                    <span className={s.title}>your list</span>
                    <div className={s.header_actions}>
                        <button className={s.add_btn} onClick={() => setShowModal(true)}>+ add custom</button>
                    </div>
                </div>

                <div className={s.controls}>
                    <div className={s.filters}>
                        {STATUSES.map(st => (
                            <button
                                key={st}
                                className={`${s.filter_btn} ${status === st ? s.active : ""}`}
                                onClick={() => setStatus(st)}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                    <select
                        className={s.sort_select}
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                    >
                        {SORTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                {sorted.length === 0
                    ? <p className={s.empty}>nothing here</p>
                    : sorted.map(b => (
                        <div key={b.id} className={s.book_row}>
                            <img
                                className={s.cover}
                                src={b.cover}
                                alt={b.title}
                                onClick={() => navigateToBook(b)}
                                style={{ cursor: "pointer" }}
                            />

                            <div className={s.book_info} onClick={() => navigateToBook(b)} style={{ cursor: "pointer" }}>
                                <span className={s.book_title}>{b.title}</span>
                                <span className={s.book_author}>{b.author}</span>
                                {b.rereads > 0 && (
                                    <span className={s.reread_badge}>reread #{b.rereads}</span>
                                )}
                            </div>

                            <div className={s.book_actions}>
                                <StarRating
                                    value={b.rating}
                                    onChange={v => patch(b.id, { rating: v })}
                                />

                                <div className={s.pages_group}>
                                    <input
                                        className={s.page_input}
                                        type="number"
                                        min={0}
                                        value={b.progress ?? 0}
                                        onChange={e => handleReadChange(b.id, e.target.value)}
                                        title="pages read"
                                        placeholder="read"
                                    />
                                    <span className={s.page_sep}>/</span>
                                    <input
                                        className={s.page_input}
                                        type="number"
                                        min={0}
                                        value={b.total_pages ?? ""}
                                        onChange={e => handleTotalChange(b.id, e.target.value)}
                                        title="total pages"
                                        placeholder="total"
                                    />
                                </div>

                                <select
                                    className={s.status_select}
                                    value={b.status}
                                    onChange={e => patch(b.id, { status: e.target.value })}
                                >
                                    {STATUSES.filter(s => s !== "all").map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>

                                <button
                                    className={s.reread_btn}
                                    onClick={() => handleReread(b.id, b.title)}
                                    title="start reread (resets progress)"
                                >
                                    ⟳
                                </button>

                                <button className={s.delete_btn} onClick={() => remove(b.id, b.title)} title="remove">✕</button>
                            </div>
                        </div>
                    ))
                }
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
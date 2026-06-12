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
}

const STATUSES = ["all", "reading", "plan", "completed", "dropped", "hold"]
const SORTS = ["recently added", "title a-z", "author a-z", "rating"]

export default function BookList() {
    const { token } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [books, setBooks] = useState<Book[]>([])
    const [status, setStatus] = useState("all")
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
        await fetch(`http://127.0.0.1:8000/list/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })
        setBooks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
    }

    const remove = async (id: number, title: string) => {
        await fetch(`http://127.0.0.1:8000/list/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        })
        setBooks(prev => prev.filter(b => b.id !== id))
        showToast(`"${title}" removed`)
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
                            <img className={s.cover} src={b.cover} alt={b.title} />

                            <div className={s.book_info}>
                                <span className={s.book_title}>{b.title}</span>
                                <span className={s.book_author}>{b.author}</span>
                            </div>

                            <div className={s.book_actions}>
                                <StarRating
                                    value={b.rating}
                                    onChange={v => patch(b.id, { rating: v })}
                                />

                                <input
                                    className={s.progress_input}
                                    type="number"
                                    min={0}
                                    value={b.progress ?? 0}
                                    onChange={e => patch(b.id, { progress: parseInt(e.target.value) || 0 })}
                                    title="pages read"
                                />

                                <select
                                    className={s.status_select}
                                    value={b.status}
                                    onChange={e => patch(b.id, { status: e.target.value })}
                                >
                                    {STATUSES.filter(s => s !== "all").map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>

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
import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
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

export default function BookList() {
    const { token } = useAuth()
    const [books, setBooks] = useState<Book[]>([])
    const [status, setStatus] = useState("all")

    useEffect(() => {
        if (!token) return
        fetch(`http://127.0.0.1:8000/list?status=${status}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setBooks)
            .catch(console.error)
    }, [token, status])

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.header}>
                    <span className={s.title}>Your list</span>
                </div>

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

                {books.length === 0
                    ? <p className={s.empty}>nothing here</p>
                    : <table className={s.table}>
                        <thead>
                            <tr>
                                <th></th>
                                <th>title</th>
                                <th>author</th>
                                <th>status</th>
                                <th>rating</th>
                                <th>progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(b => (
                                <tr key={b.id}>
                                    <td><img className={s.cover_thumb} src={b.cover} alt={b.title} /></td>
                                    <td>{b.title}</td>
                                    <td>{b.author}</td>
                                    <td><span className={s.status_badge}>{b.status}</span></td>
                                    <td>{b.rating ?? "—"}</td>
                                    <td>{b.progress ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
            </div>
        </>
    )
}
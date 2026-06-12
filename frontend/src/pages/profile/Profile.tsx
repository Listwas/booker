import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Nav from "../home/components/nav/Nav"
import BookCard from "../../components/BookCard"
import s from "./profile.module.css"

interface Stats {
    total: number
    reading: number
    completed: number
    plan: number
    dropped: number
    hold: number
    total_pages_read: number
    reading_time_hours: number
    reading_time_days: number
}

interface Book {
    id: number
    title: string
    author: string
    cover: string
    status: string
    rating: number | null
    progress: number | null
    work_id: string | null
}

interface ProfileData {
    username: string
    email: string
    stats: Stats
}

const SEGMENTS = [
    { key: "reading",   cls: s.seg_reading },
    { key: "completed", cls: s.seg_completed },
    { key: "plan",      cls: s.seg_plan },
    { key: "dropped",   cls: s.seg_dropped },
    { key: "hold",      cls: s.seg_hold },
] as const

export default function Profile() {
    const { token } = useAuth()
    const [data, setData] = useState<ProfileData | null>(null)
    const [recent, setRecent] = useState<Book[]>([])

    useEffect(() => {
        if (!token) return

        fetch("http://127.0.0.1:8000/profile", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setData)
            .catch(console.error)

        fetch("http://127.0.0.1:8000/list?status=all", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then((books: Book[]) => setRecent(books.slice(-5).reverse()))
            .catch(console.error)
    }, [token])

    if (!token) return (
        <>
            <Nav />
            <div className={s.logged_out}>
                <p>you don't have an account yet</p>
                <Link to="/auth" state={{ mode: "register" }} className={s.cta_btn}>create account</Link>
            </div>
        </>
    )

    if (!data) return <Nav />

    const total = data.stats.total || 1

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.banner} />

                <div className={s.header}>
                    <div className={s.avatar}>{data.username.slice(0, 2).toUpperCase()}</div>
                    <p className={s.username}>{data.username}</p>
                </div>

                <div className={s.stats_section}>
                    <p className={s.section_title}>statistics</p>

                    <div className={s.stats_row}>
                        {(["total", "reading", "completed", "plan", "dropped", "hold"] as const).map(key => (
                            <div className={s.stat} key={key}>
                                <span className={s.stat_value}>{data.stats[key]}</span>
                                <span className={s.stat_label}>{key}</span>
                            </div>
                        ))}
                    </div>

                    <div className={s.stats_row}>
                        <div className={s.stat}>
                            <span className={s.stat_value}>{data.stats.total_pages_read}</span>
                            <span className={s.stat_label}>pages read</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat_value}>{data.stats.reading_time_hours}</span>
                            <span className={s.stat_label}>hours read</span>
                        </div>
                        <div className={s.stat}>
                            <span className={s.stat_value}>{data.stats.reading_time_days}</span>
                            <span className={s.stat_label}>days read</span>
                        </div>
                    </div>

                    <div className={s.progress_bar}>
                        {SEGMENTS.map(({ key, cls }) => (
                            data.stats[key] > 0 && (
                                <div
                                    key={key}
                                    className={`${s.progress_segment} ${cls}`}
                                    style={{ width: `${(data.stats[key] / total) * 100}%` }}
                                />
                            )
                        ))}
                    </div>

                    <div className={s.legend}>
                        {SEGMENTS.map(({ key, cls }) => (
                            data.stats[key] > 0 && (
                                <div key={key} className={s.legend_item}>
                                    <div className={`${s.legend_dot} ${cls}`} />
                                    <span>{key} ({data.stats[key]})</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {recent.length > 0 && (
                    <div className={s.recent_section}>
                        <p className={s.section_title}>recently added</p>
                        <div className={s.recent_grid}>
                            {recent.map((b, i) => (
                                <BookCard
                                    key={i}
                                    title={b.title}
                                    author={b.author}
                                    cover={b.cover}
                                    workId={b.work_id || undefined}
                                    hideAddButton={true}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
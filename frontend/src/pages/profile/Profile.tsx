import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import BookCard from "../../components/BookCard"
import { apiProfile, apiList, apiExport, apiDeleteAccount, ApiError } from "../../lib/api"
import type { MonthlyStat, ProfileData, UserBook } from "../../lib/types"
import s from "./Profile.module.css"

const MONTH_LABELS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

function MonthlyChart({ monthly }: { monthly: MonthlyStat[] }) {
    if (monthly.every((m) => m.books === 0)) return null
    const max = Math.max(...monthly.map((m) => m.books))

    return (
        <section className={s.stats_section}>
            <p className={s.section_title}>books finished per month</p>
            <div className={s.chart}>
                {monthly.map((m) => {
                    const monthIdx = parseInt(m.month.slice(5), 10) - 1
                    return (
                        <div className={s.chart_col} key={m.month}>
                            <span className={s.chart_value}>{m.books > 0 ? m.books : ""}</span>
                            <div
                                className={s.chart_bar}
                                style={{ height: `${(m.books / max) * 100}%` }}
                                title={`${m.month}: ${m.books} books, ${m.pages.toLocaleString()} pages`}
                            />
                            <span className={s.chart_label}>{MONTH_LABELS[monthIdx] ?? m.month}</span>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

const SEGMENTS = [
    { key: "reading", cls: s.seg_reading, label: "reading" },
    { key: "completed", cls: s.seg_completed, label: "completed" },
    { key: "plan", cls: s.seg_plan, label: "plan" },
    { key: "dropped", cls: s.seg_dropped, label: "dropped" },
    { key: "hold", cls: s.seg_hold, label: "hold" },
] as const

export default function Profile() {
    const { token, user, loading } = useAuth()

    const { data } = useQuery<ProfileData>({
        queryKey: ["profile"],
        queryFn: () => apiProfile(token!),
        enabled: !!token,
    })

    const { data: listData } = useQuery<UserBook[]>({
        queryKey: ["list", "all"],
        queryFn: () => apiList(token!, "all"),
        enabled: !!token,
    })

    if (loading) {
        return (
            <>
                <Nav />
                <div className={s.logged_out}>loading…</div>
                <Footer />
            </>
        )
    }

    if (!token || !user) {
        return (
            <>
                <Nav />
                <div className={s.logged_out}>
                    <p>you don't have an account yet. create one to build your own library, track reading and rate books.</p>
                    <Link to="/auth" state={{ mode: "register" }} className={s.cta_btn}>create account</Link>
                </div>
                <Footer />
            </>
        )
    }

    if (!data) {
        return (
            <>
                <Nav />
                <Footer />
            </>
        )
    }

    const total = data.stats.total || 1
    const recent = (listData ?? []).slice(0, 5)

    const statCards = [
        { label: "total", value: data.stats.total },
        { label: "reading", value: data.stats.reading },
        { label: "completed", value: data.stats.completed },
        { label: "plan", value: data.stats.plan },
        { label: "dropped", value: data.stats.dropped },
        { label: "hold", value: data.stats.hold },
    ]

    const metricCards = [
        { label: "pages read", value: data.stats.total_pages_read },
        { label: "hours read", value: data.stats.reading_time_hours },
        { label: "days read", value: data.stats.reading_time_days },
    ]

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.banner} />

                <div className={s.header}>
                    <div className={s.avatar}>{data.username.slice(0, 2).toUpperCase()}</div>
                    <p className={s.username}>{data.username}</p>
                </div>

                <section className={s.stats_section}>
                    <p className={s.section_title}>library stats</p>

                    <div className={s.stats_grid}>
                        {statCards.map((stat) => (
                            <div className={s.stats_card} key={stat.label}>
                                <span className={s.stats_value}>{stat.value}</span>
                                <span className={s.stats_label}>{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className={`${s.stats_grid} ${s.metrics}`}>
                        {metricCards.map((metric) => (
                            <div className={s.stats_card} key={metric.label}>
                                <span className={s.stats_value}>{metric.value.toLocaleString()}</span>
                                <span className={s.stats_label}>{metric.label}</span>
                            </div>
                        ))}
                    </div>

                    {data.stats.total > 0 && (
                        <>
                            <div className={s.progress_bar}>
                                {SEGMENTS.map(({ key, cls }) =>
                                    data.stats[key] > 0 ? (
                                        <div
                                            key={key}
                                            className={`${s.progress_segment} ${cls}`}
                                            style={{ width: `${(data.stats[key] / total) * 100}%` }}
                                            title={`${key}: ${data.stats[key]} books`}
                                        />
                                    ) : null
                                )}
                            </div>
                            <div className={s.legend}>
                                {SEGMENTS.map(({ key, cls, label }) =>
                                    data.stats[key] > 0 ? (
                                        <div key={key} className={s.legend_item}>
                                            <div className={`${s.legend_dot} ${cls}`} />
                                            <span>{label} ({data.stats[key]})</span>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        </>
                    )}
                </section>

                <MonthlyChart monthly={data.monthly ?? []} />

                {recent.length > 0 && (
                    <section className={s.recent_section}>
                        <p className={s.section_title}>recently added</p>
                        <div className={s.recent_grid}>
                            {recent.map((b) => (
                                <BookCard
                                    key={b.id}
                                    book={{
                                        title: b.title,
                                        author: b.author,
                                        cover: b.cover,
                                        work_id: b.work_id ?? "",
                                        community: b.community ?? { rating: null, count: 0 },
                                    }}
                                    hideAddButton
                                />
                            ))}
                        </div>
                    </section>
                )}

                <AccountSection token={token} />
            </div>
            <Footer />
        </>
    )
}

function AccountSection({ token }: { token: string }) {
    const { logout } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const [confirming, setConfirming] = useState(false)
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)

    const download = async (format: "csv" | "json") => {
        try {
            const blob = await apiExport(token, format)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `booker-library.${format}`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            showToast("Export failed", "error")
        }
    }

    const deleteAccount = async () => {
        setBusy(true)
        try {
            await apiDeleteAccount(token, password)
            logout()
            showToast("account deleted")
            navigate("/")
        } catch (err) {
            showToast(err instanceof ApiError ? err.message : "Failed to delete account", "error")
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className={s.account_section}>
            <p className={s.section_title}>account</p>
            <div className={s.account_row}>
                <button className={s.ghost_btn} onClick={() => download("csv")}>
                    export library (csv)
                </button>
                <button className={s.ghost_btn} onClick={() => download("json")}>
                    export library (json)
                </button>

                {confirming ? (
                    <div className={s.danger_confirm}>
                        <input
                            type="password"
                            placeholder="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button
                            className={s.danger_btn}
                            disabled={!password || busy}
                            onClick={deleteAccount}
                        >
                            {busy ? "deleting…" : "confirm delete"}
                        </button>
                        <button
                            className={s.ghost_btn}
                            onClick={() => {
                                setConfirming(false)
                                setPassword("")
                            }}
                        >
                            cancel
                        </button>
                    </div>
                ) : (
                    <button className={s.danger_ghost_btn} onClick={() => setConfirming(true)}>
                        delete account
                    </button>
                )}
            </div>
        </section>
    )
}
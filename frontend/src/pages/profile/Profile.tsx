import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import BookCard from "../../components/BookCard"
import { apiProfile, apiList, apiExport, apiDeleteAccount, apiChangePassword, apiSetAvatar, apiSetBanner, ApiError } from "../../lib/api"
import { resizeImage } from "../../lib/image"
import { useLang, type Lang, type TKey } from "../../lib/i18n"
import type { MonthlyStat, ProfileData, UserBook } from "../../lib/types"
import s from "./Profile.module.css"

function monthLabel(iso: string, lang: Lang) {
    const [y, m] = iso.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(lang, { month: "short" })
}

function MonthlyChart({ monthly }: { monthly: MonthlyStat[] }) {
    const { t, lang } = useLang()
    if (monthly.length === 0) return null
    const max = Math.max(1, ...monthly.map((m) => m.books))

    return (
        <section className={s.stats_section}>
            <p className={s.section_title}>{t("profile_chart")}</p>
            <div className={s.chart}>
                {monthly.map((m) => (
                    <div className={s.chart_col} key={m.month}>
                        <span className={s.chart_value}>{m.books > 0 ? m.books : ""}</span>
                        <div
                            className={s.chart_bar}
                            style={{ height: `${(m.books / max) * 100}%` }}
                            title={`${m.month}: ${t("profile_books", { n: m.books })}`}
                        />
                        <span className={s.chart_label}>{monthLabel(m.month, lang)}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}

const SEGMENTS = [
    { key: "reading", cls: s.seg_reading },
    { key: "completed", cls: s.seg_completed },
    { key: "plan", cls: s.seg_plan },
    { key: "dropped", cls: s.seg_dropped },
    { key: "hold", cls: s.seg_hold },
] as const

export default function Profile() {
    const { token, user, loading } = useAuth()
    const { t } = useLang()

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
                <div className={s.logged_out}>{t("loading")}</div>
                <Footer />
            </>
        )
    }

    if (!token || !user) {
        return (
            <>
                <Nav />
                <div className={s.logged_out}>
                    <p>{t("profile_logged_out")}</p>
                    <Link to="/auth" state={{ mode: "register" }} className={s.cta_btn}>{t("profile_create_account")}</Link>
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
        { label: t("stat_total"), value: data.stats.total },
        { label: t("status_reading"), value: data.stats.reading },
        { label: t("status_completed"), value: data.stats.completed },
        { label: t("status_plan"), value: data.stats.plan },
        { label: t("status_dropped"), value: data.stats.dropped },
        { label: t("status_hold"), value: data.stats.hold },
    ]

    const metricCards = [
        { label: t("stat_pages_read"), value: data.stats.total_pages_read },
        { label: t("stat_hours_read"), value: data.stats.reading_time_hours },
        { label: t("stat_days_read"), value: data.stats.reading_time_days },
    ]

    return (
        <>
            <Nav />
            <div className={s.page}>
                <ProfileHeader data={data} token={token} />

                <section className={s.stats_section}>
                    <p className={s.section_title}>{t("profile_stats")}</p>

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
                                {SEGMENTS.map(({ key, cls }) =>
                                    data.stats[key] > 0 ? (
                                        <div key={key} className={s.legend_item}>
                                            <div className={`${s.legend_dot} ${cls}`} />
                                            <span>{t(`status_${key}` as TKey)} ({data.stats[key]})</span>
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
                        <p className={s.section_title}>{t("profile_recent")}</p>
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

function ProfileHeader({ data, token }: { data: ProfileData; token: string }) {
    const qc = useQueryClient()
    const { refreshUser } = useAuth()
    const { t, te } = useLang()
    const { showToast } = useToast()

    const upload = async (file: File | undefined, kind: "avatar" | "banner") => {
        if (!file) return
        try {
            const image = kind === "avatar"
                ? await resizeImage(file, 256, 256)
                : await resizeImage(file, 1600, 500)
            if (kind === "avatar") await apiSetAvatar(token, image)
            else await apiSetBanner(token, image)
            await qc.invalidateQueries({ queryKey: ["profile"] })
            refreshUser()
            showToast(t(kind === "avatar" ? "toast_avatar_updated" : "toast_banner_updated"))
        } catch (err) {
            showToast(err instanceof ApiError ? te(err.message) : t("toast_image_failed"), "error")
        }
    }

    return (
        <>
            <label
                className={s.banner}
                style={data.banner ? { backgroundImage: `url(${data.banner})` } : undefined}
                title={t("change_banner")}
            >
                <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                        upload(e.target.files?.[0], "banner")
                        e.target.value = ""
                    }}
                />
                <span className={s.image_hint}>{t("change_banner")}</span>
            </label>

            <div className={s.header}>
                <label className={s.avatar} title={t("change_avatar")}>
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                            upload(e.target.files?.[0], "avatar")
                            e.target.value = ""
                        }}
                    />
                    {data.avatar
                        ? <img className={s.avatar_img} src={data.avatar} alt={data.username} />
                        : data.username.slice(0, 2).toUpperCase()}
                    <span className={s.avatar_hint}>{t("change_avatar")}</span>
                </label>
                <p className={s.username}>{data.username}</p>
            </div>
        </>
    )
}

function PasswordChange({ token }: { token: string }) {
    const { t, te } = useLang()
    const { showToast } = useToast()
    const [open, setOpen] = useState(false)
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [busy, setBusy] = useState(false)

    const close = () => {
        setOpen(false)
        setCurrent("")
        setNext("")
    }

    const save = async () => {
        setBusy(true)
        try {
            await apiChangePassword(token, current, next)
            showToast(t("toast_password_changed"))
            close()
        } catch (err) {
            showToast(err instanceof ApiError ? te(err.message) : t("toast_password_failed"), "error")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className={s.account_row}>
            {open ? (
                <>
                    <input
                        className={s.account_input}
                        type="password"
                        placeholder={t("current_password_ph")}
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        autoFocus
                    />
                    <input
                        className={s.account_input}
                        type="password"
                        placeholder={t("new_password_ph")}
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                    />
                    <button
                        className={s.ghost_btn}
                        disabled={!current || next.length < 6 || busy}
                        onClick={save}
                    >
                        {busy ? t("saving") : t("save")}
                    </button>
                    <button className={s.ghost_btn} onClick={close}>{t("cancel")}</button>
                </>
            ) : (
                <button className={s.ghost_btn} onClick={() => setOpen(true)}>
                    {t("change_password")}
                </button>
            )}
        </div>
    )
}

function AccountSection({ token }: { token: string }) {
    const { logout } = useAuth()
    const { t, te } = useLang()
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
            showToast(t("toast_export_failed"), "error")
        }
    }

    const deleteAccount = async () => {
        setBusy(true)
        try {
            await apiDeleteAccount(token, password)
            logout()
            showToast(t("toast_account_deleted"))
            navigate("/")
        } catch (err) {
            showToast(err instanceof ApiError ? te(err.message) : t("toast_delete_failed"), "error")
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className={s.account_section}>
            <p className={s.section_title}>{t("profile_account")}</p>
            <PasswordChange token={token} />
            <div className={s.account_row}>
                <button className={s.ghost_btn} onClick={() => download("csv")}>
                    {t("export_csv")}
                </button>
                <button className={s.ghost_btn} onClick={() => download("json")}>
                    {t("export_json")}
                </button>

                {confirming ? (
                    <div className={s.danger_confirm}>
                        <input
                            type="password"
                            placeholder={t("password_ph")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                        <button
                            className={s.danger_btn}
                            disabled={!password || busy}
                            onClick={deleteAccount}
                        >
                            {busy ? t("deleting") : t("confirm_delete")}
                        </button>
                        <button
                            className={s.ghost_btn}
                            onClick={() => {
                                setConfirming(false)
                                setPassword("")
                            }}
                        >
                            {t("cancel")}
                        </button>
                    </div>
                ) : (
                    <button className={s.danger_ghost_btn} onClick={() => setConfirming(true)}>
                        {t("delete_account")}
                    </button>
                )}
            </div>
        </section>
    )
}
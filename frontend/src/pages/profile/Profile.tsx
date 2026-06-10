import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Nav from "../home/components/nav/Nav"
import s from "./profile.module.css"

interface Stats {
    total: number
    reading: number
    completed: number
    plan: number
    dropped: number
    hold: number
}

interface ProfileData {
    username: string
    email: string
    stats: Stats
}

export default function Profile() {
    const { token } = useAuth()
    const [data, setData] = useState<ProfileData | null>(null)

    useEffect(() => {
        if (!token) return
        fetch("http://127.0.0.1:8000/profile", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setData)
            .catch(console.error)
    }, [token])

    return (
        <>
            <Nav />
            {!token ? (
                <div className={s.logged_out}>
                    <p>you don't have an account yet</p>
                    <Link to="/auth" state={{ mode: "register" }} className={s.cta_btn}>create account</Link>
                </div>
            ) : !data ? null : (
                <div className={s.page}>
                    <div className={s.banner} />
                    <div className={s.header}>
                        <div className={s.avatar}>{data.username.slice(0, 2).toUpperCase()}</div>
                        <div>
                            <p className={s.username}>{data.username}</p>
                        </div>
                    </div>
                    <div className={s.stats_row}>
                        {(["total", "reading", "completed", "plan", "dropped", "hold"] as const).map(key => (
                            <div className={s.stat} key={key}>
                                <span className={s.stat_value}>{data.stats[key]}</span>
                                <span className={s.stat_label}>{key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
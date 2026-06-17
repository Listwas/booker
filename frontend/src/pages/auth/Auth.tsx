import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import s from "./auth.module.css"

export default function Auth() {
    const location = useLocation()
    const initialMode = location.state?.mode ?? "register"
    const [mode, setMode] = useState<"login" | "register">(initialMode)
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const { login } = useAuth()
    const navigate = useNavigate()

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") submit()
    }

    const submit = async () => {
        setError("")
        setLoading(true)

        if (mode === "register") {
            if (!username.trim() || !email.trim() || !password.trim()) {
                setError("All fields are required")
                setLoading(false)
                return
            }
            if (password.length < 4) {
                setError("Password must be at least 4 characters")
                setLoading(false)
                return
            }
            const res = await fetch("http://127.0.0.1:8000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            })
            if (!res.ok) {
                const d = await res.json()
                setError(d.detail || "Registration failed")
                setLoading(false)
                return
            }
        }

        const ok = await login(username, password)
        if (!ok) {
            setError("Invalid username or password")
            setLoading(false)
            return
        }
        navigate("/")
    }

    return (
        <div className={s.page}>
            <div className={s.box}>
                <Link to="/" className={s.logo}>Booker</Link>

                <div className={s.toggle}>
                    <button onClick={() => { setMode("login"); setError(""); }} className={mode === "login" ? s.active : ""}>login</button>
                    <button onClick={() => { setMode("register"); setError(""); }} className={mode === "register" ? s.active : ""}>register</button>
                </div>

                <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKey} disabled={loading}/>
                {mode === "register" && <input placeholder="email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} disabled={loading}/>}
                <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} disabled={loading}/>

                {error && <span className={s.error}>{error}</span>}

                <button className={s.submit} onClick={submit} disabled={loading}>{loading ? "..." : mode}</button>
            </div>
        </div>
    )
}
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import s from "./auth.module.css"

export default function Auth() {
    const [mode, setMode] = useState<"login" | "register">("login")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const { login } = useAuth()
    const navigate = useNavigate()

    const submit = async () => {
        setError("")
        if (mode === "register") {
            const res = await fetch("http://127.0.0.1:8000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            })
            if (!res.ok) {
                const d = await res.json()
                setError(d.detail)
                return
            }
        }
        const ok = await login(username, password)
        if (!ok) { setError("Invalid credentials"); return }
        navigate("/")
    }

    return (
        <div className={s.page}>
            <div className={s.box}>
                <span className={s.logo}>Booker</span>

                <div className={s.toggle}>
                    <button onClick={() => setMode("login")} className={mode === "login" ? s.active : ""}>login</button>
                    <button onClick={() => setMode("register")} className={mode === "register" ? s.active : ""}>register</button>
                </div>

                <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
                {mode === "register" && <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />}
                <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

                {error && <span className={s.error}>{error}</span>}

                <button className={s.submit} onClick={submit}>{mode}</button>
            </div>
        </div>
    )
}
import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface User {
    username: string
    email: string
}

interface ListIds {
    work_ids: (string | null)[]
    titles: string[]
    authors: string[]
}

interface AuthContextType {
    user: User | null
    token: string | null
    listIds: ListIds | null
    login: (username: string, password: string) => Promise<boolean>
    logout: () => void
    refreshListIds: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"))
    const [user, setUser] = useState<User | null>(null)
    const [listIds, setListIds] = useState<ListIds | null>(null)

    const refreshListIds = useCallback(() => {
        const t = localStorage.getItem("token")
        if (!t) return
        fetch("http://127.0.0.1:8000/list/ids", {
            headers: { Authorization: `Bearer ${t}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setListIds(d) })
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!token) return
        fetch("http://127.0.0.1:8000/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) {
                    setUser(d)
                    refreshListIds()
                }
            })
            .catch(() => {
                localStorage.removeItem("token")
                setToken(null)
            })
    }, [])

    const login = async (username: string, password: string) => {
        const res = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username, password })
        })
        if (!res.ok) return false

        const data = await res.json()
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("hasAccount", "true")
        setToken(data.access_token)

        const me = await fetch("http://127.0.0.1:8000/me", {
            headers: { Authorization: `Bearer ${data.access_token}` }
        })
        setUser(await me.json())
        refreshListIds()
        return true
    }

    const logout = () => {
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
        setListIds(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, listIds, login, logout, refreshListIds }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
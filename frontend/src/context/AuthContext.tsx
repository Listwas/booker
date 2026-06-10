import { createContext, useContext, useState } from "react"

interface User {
    username: string
    email: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (username: string, password: string) => Promise<boolean>
    logout: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"))
    const [user, setUser] = useState<User | null>(null)

    const login = async (username: string, password: string) => {
        const res = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username, password })
        })
        if (!res.ok) return false

        const data = await res.json()
        localStorage.setItem("token", data.access_token)
        setToken(data.access_token)

        const me = await fetch("http://127.0.0.1:8000/me", {
            headers: { Authorization: `Bearer ${data.access_token}` }
        })
        setUser(await me.json())
        return true
    }

    const logout = () => {
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiMe, apiListIds, apiLogin, apiRegister, ApiError } from "../lib/api"
import { useToast } from "./ToastContext"
import { useLang } from "../lib/i18n"
import type { AuthUser, ListIds } from "../lib/types"

interface AuthContextType {
    user: AuthUser | null
    token: string | null
    listIds: ListIds | null
    loading: boolean
    sessionError: boolean
    retrySession: () => void
    login: (username: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    logout: () => void
    refreshUser: () => void
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const qc = useQueryClient()
    const { t } = useLang()
    const { showToast } = useToast()
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"))
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)

    const [sessionError, setSessionError] = useState(false)
    const [sessionAttempt, setSessionAttempt] = useState(0)
    const retrySession = () => {
        setSessionError(false)
        setLoading(true)
        setSessionAttempt((value) => value + 1)
    }

    // listIds is in tanstack query so invalidation propagates everywhere
    const listIdsQuery = useQuery<ListIds>({
        queryKey: ["listIds"],
        queryFn: () => apiListIds(token!),
        enabled: !!token,
        staleTime: 60 * 1000,
    })

    useEffect(() => {
        if (!token) {
            setLoading(false)
            return
        }
        let cancelled = false
        apiMe(token)
            .then((data) => {
                if (!cancelled) {
                    setUser(data)
                    setSessionError(false)
                }
            })
            .catch((error) => {
                if (cancelled) return
                if (error instanceof ApiError && error.status === 401) {
                    localStorage.removeItem("token")
                    setToken(null)
                    setUser(null)
                } else {
                    setSessionError(true)
                }
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [token, sessionAttempt])

    // user-scoped queries, cleared on account switch
    const clearUserQueries = useCallback(() => {
        for (const key of ["listIds", "list", "profile", "recommendations"]) {
            qc.removeQueries({ queryKey: [key] })
        }
    }, [qc])

    // token expired mid-session
    useEffect(() => {
        const onExpired = () => {
            if (!localStorage.getItem("token")) return
            localStorage.removeItem("token")
            setToken(null)
            setUser(null)
            clearUserQueries()
            showToast(t("toast_session_expired"), "error")
        }
        window.addEventListener("auth-expired", onExpired)
        return () => window.removeEventListener("auth-expired", onExpired)
    }, [clearUserQueries, showToast, t])

    const login = useCallback(
        async (username: string, password: string) => {
            const data = await apiLogin(username, password)
            const me = await apiMe(data.access_token)
            clearUserQueries()
            localStorage.setItem("token", data.access_token)
            localStorage.setItem("hasAccount", "true")
            setSessionError(false)
            setToken(data.access_token)
            setUser(me)
            await qc.prefetchQuery({
                queryKey: ["listIds"],
                queryFn: () => apiListIds(data.access_token),
            })
        },
        [qc, clearUserQueries]
    )

    const register = useCallback(
        async (username: string, email: string, password: string) => {
            await apiRegister(username, email, password)
            await login(username, password)
        },
        [login]
    )

    const logout = useCallback(() => {
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
        setSessionError(false)
        clearUserQueries()
    }, [clearUserQueries])

    const refreshUser = useCallback(() => {
        if (!token) return
        apiMe(token).then(setUser).catch(() => {})
    }, [token])

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                listIds: token ? listIdsQuery.data ?? null : null,
                loading,
                sessionError,
                retrySession,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
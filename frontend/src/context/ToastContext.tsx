import { createContext, useContext, useState, useCallback } from "react"

interface Toast {
    id: number
    message: string
}

interface ToastContextType {
    showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextType>(null!)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 2500)
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast_container">
                {toasts.map(t => (
                    <div key={t.id} className="toast">{t.message}</div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
import { useEffect } from "react"

export function useTitle(name: string) {
    useEffect(() => {
        document.title = name ? `${name} · booker` : "booker"
    }, [name])
}

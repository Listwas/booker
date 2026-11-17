import { useEffect, useRef } from "react"
import { useLang } from "../lib/i18n"
import type { UserBook } from "../lib/types"
import UserEntryPanel from "./UserEntryPanel"
import s from "./CustomAddModal.module.css"

export default function CustomEntryModal({ entry, token, onClose }: {
    entry: UserBook; token: string; onClose: () => void
}) {
    const { t } = useLang()
    const close = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        close.current?.focus()
        return () => { previous?.focus() }
    }, [])
    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} role="dialog" aria-modal="true" aria-label={entry.title}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => { if (event.key === "Escape") onClose() }}>
                <div className={s.header}>
                    <h2 className={s.modal_title}>{entry.title}</h2>
                    <button ref={close} className={s.close_btn} onClick={onClose} aria-label={t("cancel")}>✕</button>
                </div>
                <UserEntryPanel entry={entry} token={token} />
            </div>
        </div>
    )
}

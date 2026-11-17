import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "../context/ToastContext"
import { apiPatchBook, ApiError, type BookPatch } from "../lib/api"
import { invalidateRatings } from "../lib/ratings"
import { useLang, type Lang, type TKey } from "../lib/i18n"
import { STATUSES, statusColors, type BookStatus, type UserBook } from "../lib/types"
import StarRating from "./StarRating"
import s from "../pages/bookpage/BookPage.module.css"

const LIST_KEY = ["list", "all"] as const

function formatDate(iso: string | null, lang: Lang) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString(lang, {
        year: "numeric", month: "short", day: "numeric",
    })
}

export default function UserEntryPanel({ entry, token }: { entry: UserBook; token: string }) {
    const qc = useQueryClient()
    const { t, te, lang } = useLang()
    const { showToast } = useToast()
    const [draftNote, setDraftNote] = useState<string | null>(null)
    const noteRef = useRef<HTMLTextAreaElement>(null)

    const noteValue = draftNote ?? entry.note ?? ""
    const noteDirty = draftNote != null && draftNote !== (entry.note ?? "")

    // grow with the text up to the css max-height
    useEffect(() => {
        const el = noteRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight + 2}px`
    }, [noteValue])

    const patchMutation = useMutation({
        mutationFn: (body: BookPatch) => apiPatchBook(token, entry.id, body),
        onSuccess: (updated, body) => {
            qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            qc.invalidateQueries({ queryKey: ["profile"] })
            void invalidateRatings(qc)
            if (body.note !== undefined) {
                setDraftNote(null)
                showToast(t("toast_note_saved"))
            }
        },
        onError: (err) => {
            showToast(err instanceof ApiError ? te(err.message) : t("toast_update_failed"), "error")
        },
    })

    const c = statusColors(entry.status)
    const started = formatDate(entry.started_at, lang)
    const finished = formatDate(entry.finished_at, lang)

    return (
        <div className={s.entry_panel}>
            <div className={s.entry_header}>
                <span className={s.entry_title}>{t("entry_title")}</span>
                <Link to="/list" className={s.entry_link}>{t("entry_view_list")}</Link>
            </div>

            <div className={s.entry_row}>
                <select
                    className={s.entry_status}
                    value={entry.status}
                    aria-label={t("col_status")}
                    style={{ backgroundColor: c.soft, color: c.text, borderColor: c.line }}
                    onChange={(e) => patchMutation.mutate({ status: e.target.value as BookStatus })}
                >
                    {STATUSES.filter((st) => st.key !== "all").map((st) => (
                        <option key={st.key} value={st.key}>{t(`status_${st.key}` as TKey)}</option>
                    ))}
                </select>

                <div className={s.entry_rating}>
                    <span className={s.entry_label}>{t("entry_my_rating")}</span>
                    <StarRating
                        value={entry.rating}
                        size={16}
                        onChange={(v) =>
                            patchMutation.mutate(v === null ? { clear_rating: true } : { rating: v })
                        }
                    />
                </div>
            </div>

            {(started || finished) && (
                <p className={s.entry_dates}>
                    {started && t("entry_started", { date: started })}
                    {started && finished && " · "}
                    {finished && t("entry_finished", { date: finished })}
                </p>
            )}

            <textarea
                ref={noteRef}
                className={s.entry_note}
                placeholder={t("entry_note_placeholder")}
                value={noteValue}
                rows={3}
                maxLength={2000}
                onChange={(e) => setDraftNote(e.target.value)}
                disabled={patchMutation.isPending}
                aria-label={t("entry_note_placeholder")}
            />
            {noteDirty && (
                <button
                    className={s.entry_save}
                    disabled={patchMutation.isPending}
                    onClick={() => {
                        patchMutation.mutate({ note: draftNote ?? "" })
                    }}
                >
                    {t("entry_save_note")}
                </button>
            )}
        </div>
    )
}

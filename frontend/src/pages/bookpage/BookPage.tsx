import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import StarRating from "../../components/StarRating"
import { apiBook, apiAddBook, apiBookDescription, apiList, apiPatchBook, ApiError, type BookPatch } from "../../lib/api"
import { useLang, pluralRatings, type Lang, type TKey } from "../../lib/i18n"
import { STATUSES, STATUS_COLORS, type BookStatus, type UserBook } from "../../lib/types"
import s from "./BookPage.module.css"

const LIST_KEY = ["list", "all"] as const

export default function BookPage() {
    const { workId } = useParams<{ workId: string }>()
    const navigate = useNavigate()
    const { token, listIds } = useAuth()
    const { t, te } = useLang()
    const { showToast } = useToast()
    const qc = useQueryClient()
    const [imgLoaded, setImgLoaded] = useState(false)

    const { data: book, isLoading, error } = useQuery({
        queryKey: ["book", workId],
        queryFn: () => apiBook(workId!),
        enabled: !!workId,
        staleTime: 60 * 60 * 1000,
        retry: 2,
    })

    // the user's entry for this work, if it's in their list
    const { data: list } = useQuery({
        queryKey: LIST_KEY,
        queryFn: () => apiList(token!, "all"),
        enabled: !!token,
        staleTime: 30 * 1000,
    })
    const entry = list?.find((b) => b.work_id === workId)

    const added = !!entry || (!!listIds && !!workId && listIds.work_ids.includes(workId))

    const addMutation = useMutation({
        mutationFn: () =>
            apiAddBook(token!, {
                title: book!.title,
                author: book!.authors[0] ?? "Unknown",
                cover: book!.cover,
                status: "plan",
                work_id: workId,
            }),
        onSuccess: async () => {
            showToast(t("toast_added", { title: book!.title }))
            await qc.invalidateQueries({ queryKey: ["list"] })
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
            await qc.invalidateQueries({ queryKey: ["recommendations"] })
        },
        onError: (err) => {
            if (err instanceof ApiError && err.status === 400) {
                showToast(te(err.message))
                qc.invalidateQueries({ queryKey: ["listIds"] })
            } else {
                showToast(t("toast_add_failed"), "error")
            }
        },
    })

    const back = () => {
        if (window.history.length > 1) navigate(-1)
        else navigate("/")
    }

    if (isLoading) {
        return (
            <>
                <Nav />
                <div className={s.page}>
                    <button onClick={back} className={s.back}>{t("back")}</button>
                    <div className={s.content}>
                        <div className={`${s.cover} ${s.skeleton}`} />
                        <div className={s.info}>
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "60%", height: 32 }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "30%" }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "45%" }} />
                            <div className={`${s.skeleton_line} ${s.skeleton}`} style={{ width: "90%", height: 96 }} />
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        )
    }

    if (error || !book) {
        return (
            <>
                <Nav />
                <div className={s.page}>
                    <button onClick={back} className={s.back}>{t("back")}</button>
                    <p className={s.loading}>{t("book_load_error")}</p>
                </div>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Nav />
            <div className={s.page}>
                <button onClick={back} className={s.back}>{t("back")}</button>
                <div className={s.content}>
                    <div className={s.cover}>
                        {book.cover && (
                            <img
                                src={book.cover}
                                alt={`Cover of ${book.title}`}
                                onLoad={() => setImgLoaded(true)}
                                data-loaded={imgLoaded}
                                className="book-cover"
                            />
                        )}
                    </div>

                    <div className={s.info}>
                        <h1 className={s.title}>{book.title}</h1>
                        <p className={s.authors}>{book.authors.join(", ")}</p>

                        <div className={s.rating_row}>
                            {book.community.rating != null ? (
                                <>
                                    <StarRating value={book.community.rating} readonly size={18} />
                                    <span className={s.rating_label}>
                                        {book.community.rating.toFixed(1)}
                                    </span>
                                    <span className={s.rating_count}>
                                        {t("book_ratings_from", {
                                            count: book.community.count.toLocaleString(),
                                            ratings: pluralRatings(book.community.count, t),
                                            source: t(book.community.source === "openlibrary" ? "source_openlibrary" : "source_booker"),
                                        })}
                                    </span>
                                </>
                            ) : (
                                <span className={s.rating_count}>{t("card_no_ratings")}</span>
                            )}
                        </div>

                        {book.first_publish_year && (
                            <p className={s.year}>{t("book_first_published")} {book.first_publish_year}</p>
                        )}

                        {book.subjects.length > 0 && (
                            <div className={s.meta}>
                                {book.subjects.map((sub, i) => (
                                    <span key={i} className={s.subject_pill}>{sub}</span>
                                ))}
                            </div>
                        )}

                        {book.description && (
                            <BookDescription workId={workId!} original={book.description} />
                        )}

                        {entry ? (
                            <UserEntryPanel entry={entry} token={token!} />
                        ) : added ? (
                            <Link to="/list" className={s.added_link}>
                                {t("book_already_link")}
                            </Link>
                        ) : (
                            <button
                                className={s.add_btn}
                                onClick={() => {
                                    if (!token) {
                                        showToast(t("toast_login_to_add"))
                                        navigate("/auth", { state: { mode: localStorage.getItem("hasAccount") ? "login" : "register" } })
                                        return
                                    }
                                    addMutation.mutate()
                                }}
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending
                                    ? t("book_adding")
                                    : token
                                    ? t("card_add")
                                    : t("book_login_to_add")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

// openlibrary descriptions are english, non-english ui gets a translate
// toggle backed by the backend's mymemory proxy
function BookDescription({ workId, original }: { workId: string; original: string }) {
    const { t, lang } = useLang()
    const { showToast } = useToast()
    const [translated, setTranslated] = useState(false)

    const { data, isFetching, isError } = useQuery({
        queryKey: ["description", workId, lang],
        queryFn: () => apiBookDescription(workId, lang),
        enabled: lang !== "en" && translated,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    })

    useEffect(() => {
        if (isError && translated) {
            setTranslated(false)
            showToast(t("toast_translate_failed"), "error")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isError])

    const text = translated && data?.description ? data.description : original

    return (
        <div className={s.description_block}>
            <p className={s.description}>{text}</p>
            {lang !== "en" && (
                <div className={s.translate_row}>
                    <button
                        className={s.translate_btn}
                        onClick={() => setTranslated((v) => !v)}
                        disabled={isFetching}
                    >
                        {isFetching
                            ? t("book_translating")
                            : translated && data?.description
                            ? t("book_show_original")
                            : t("book_translate")}
                    </button>
                    {translated && data?.description && (
                        <span className={s.translate_note}>{t("book_translated_by")}</span>
                    )}
                </div>
            )}
        </div>
    )
}

function formatDate(iso: string | null, lang: Lang) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString(lang, {
        year: "numeric", month: "short", day: "numeric",
    })
}

function UserEntryPanel({ entry, token }: { entry: UserBook; token: string }) {
    const qc = useQueryClient()
    const { t, te, lang } = useLang()
    const { showToast } = useToast()
    const [draftNote, setDraftNote] = useState<string | null>(null)
    const noteRef = useRef<HTMLTextAreaElement>(null)

    const noteValue = draftNote ?? entry.note ?? ""
    const noteDirty = draftNote != null && draftNote !== (entry.note ?? "")

    // grow with the text, scroll only once the max height is hit
    useEffect(() => {
        const el = noteRef.current
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight + 2}px`
    }, [noteValue])

    const patchMutation = useMutation({
        mutationFn: (body: BookPatch) => apiPatchBook(token, entry.id, body),
        onSuccess: (updated) => {
            qc.setQueryData<UserBook[]>(LIST_KEY, (old) =>
                old ? old.map((b) => (b.id === updated.id ? updated : b)) : [updated]
            )
            qc.invalidateQueries({ queryKey: ["profile"] })
        },
        onError: (err) => {
            showToast(err instanceof ApiError ? te(err.message) : t("toast_update_failed"), "error")
        },
    })

    const color = STATUS_COLORS[entry.status] ?? "#888"
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
                    style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }}
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
            />
            {noteDirty && (
                <button
                    className={s.entry_save}
                    disabled={patchMutation.isPending}
                    onClick={() => {
                        patchMutation.mutate({ note: draftNote ?? "" })
                        setDraftNote(null)
                        showToast(t("toast_note_saved"))
                    }}
                >
                    {t("entry_save_note")}
                </button>
            )}
        </div>
    )
}

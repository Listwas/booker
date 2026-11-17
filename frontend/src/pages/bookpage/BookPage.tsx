import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav, { Footer } from "../../components/Nav"
import StarRating from "../../components/StarRating"
import { apiBook, apiAddBook, apiBookDescription, apiList, ApiError } from "../../lib/api"
import { useLang, pluralRatings } from "../../lib/i18n"
import { useTitle } from "../../lib/title"
import UserEntryPanel from "../../components/UserEntryPanel"
import QueryError from "../../components/QueryError"
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

    const { data: book, isLoading, error, refetch } = useQuery({
        queryKey: ["book", workId],
        queryFn: () => apiBook(workId!),
        enabled: !!workId,
        staleTime: 60 * 60 * 1000,
        retry: 2,
    })

    // the user's entry for this work, if it's in their list
    const { data: list, isError: listError, refetch: retryList } = useQuery({
        queryKey: LIST_KEY,
        queryFn: () => apiList(token!, "all"),
        enabled: !!token,
        staleTime: 30 * 1000,
    })
    const entry = list?.find((b) => b.work_id === (book?.work_id ?? workId))

    useTitle(book?.title ?? "")

    const added = !!entry || (!!listIds && !!workId && listIds.work_ids.includes(workId))

    const addMutation = useMutation({
        mutationFn: () =>
            apiAddBook(token!, {
                title: book!.title,
                author: book!.authors[0] ?? "Unknown",
                cover: book!.cover,
                status: "plan",
                work_id: book!.work_id,
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
                    <QueryError onRetry={() => { void refetch() }} />
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

                        {listError ? (
                            <QueryError onRetry={() => { void retryList() }} />
                        ) : entry ? (
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

// descriptions come in english, pl ui gets a translate toggle
function BookDescription({ workId, original }: { workId: string; original: string }) {
    const { t, te, lang } = useLang()
    const { showToast } = useToast()
    const [translated, setTranslated] = useState(false)

    const { data, isFetching, isError, error: translationError } = useQuery({
        queryKey: ["description", workId, lang],
        queryFn: () => apiBookDescription(workId, lang),
        enabled: lang !== "en" && translated,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    })

    useEffect(() => {
        if (isError && translated) {
            setTranslated(false)
            showToast(translationError instanceof ApiError && translationError.status === 413
                ? te(translationError.message) : t("toast_translate_failed"), "error")
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

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import Nav from "../home/components/nav/Nav"
import StarRating from "../../components/StarRating"
import s from "./book.module.css"

interface BookDetail {
    title: string
    authors: string[]
    cover: string
    description: string
    subjects: string[]
    first_publish_year: string
    work_id: string
}

function seededRating(workId: string): number {
    let hash = 0
    for (let i = 0; i < workId.length; i++) {
        hash = workId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const val = (Math.abs(hash) % 30) / 10 + 2
    return Math.round(val * 10) / 10
}

export default function BookPage() {
    const { workId } = useParams<{ workId: string }>()
    const { token } = useAuth()
    const { showToast } = useToast()
    const [book, setBook] = useState<BookDetail | null>(null)
    const [added, setAdded] = useState(false)

    useEffect(() => {
        if (!workId) return
        fetch(`http://127.0.0.1:8000/book/${workId}`)
            .then(r => r.json())
            .then(setBook)
            .catch(console.error)
    }, [workId])

    const handleAdd = async () => {
        if (!token || !book || added) return
        const res = await fetch("http://127.0.0.1:8000/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title: book.title,
                author: book.authors[0] ?? "Unknown",
                cover: book.cover,
                status: "plan",
                rating: null,
                progress: null
            })
        })
        if (res.ok) {
            setAdded(true)
            showToast(`"${book.title}" added to plan`)
        }
    }

    if (!book) return (
        <>
            <Nav />
            <div className={s.page}>
                <p className={s.loading}>loading...</p>
            </div>
        </>
    )

    const communityRating = seededRating(workId ?? "")

    return (
        <>
            <Nav />
            <div className={s.page}>
                <div className={s.content}>
                    <div className={s.cover}>
                        {book.cover && <img src={book.cover} alt={book.title} />}
                    </div>

                    <div className={s.info}>
                        <h1 className={s.title}>{book.title}</h1>
                        <p className={s.authors}>{book.authors.join(", ")}</p>

                        <div className={s.rating_row}>
                            <StarRating value={communityRating} readonly />
                            <span className={s.rating_label}>community rating</span>
                        </div>

                        {book.first_publish_year && (
                            <p className={s.year}>first published: {book.first_publish_year}</p>
                        )}

                        {book.subjects.length > 0 && (
                            <div className={s.meta}>
                                {book.subjects.map((sub, i) => (
                                    <span key={i} className={s.subject_pill}>{sub}</span>
                                ))}
                            </div>
                        )}

                        {book.description && (
                            <p className={s.description}>{book.description}</p>
                        )}

                        <button
                            className={`${s.add_btn} ${added ? s.added : ""}`}
                            onClick={handleAdd}
                        >
                            {added ? "✓ added to list" : token ? "add to list" : "login to add"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
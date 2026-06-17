import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Nav, { Footer } from '../../components/Nav'
import BookCard from '../../components/BookCard'
import BookCardSkeleton from '../../components/BookCardSkeleton'
import { apiSearch } from '../../lib/api'
import s from './SearchPage.module.css'

export default function SearchPage() {
    const [params] = useSearchParams()
    const q = params.get("q") ?? ""

    const { data, isLoading } = useQuery({
        queryKey: ["search", q],
        queryFn: () => apiSearch(q),
        enabled: q.trim().length > 0,
        staleTime: 5 * 60 * 1000,
    })

    const books = data?.books ?? []

    return (
        <>
            <Nav />
            <div className={s.page}>
                <p className={s.heading}>
                    results for <span>"{q}"</span>
                </p>
                {isLoading ? (
                    <div className={s.grid}>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <BookCardSkeleton key={i} />
                        ))}
                    </div>
                ) : books.length === 0 ? (
                    <p className={s.empty}>nothing found</p>
                ) : (
                    <div className={s.grid}>
                        {books.map((b) => (
                            <BookCard key={b.work_id} book={b} />
                        ))}
                    </div>
                )}
            </div>
            <Footer />
        </>
    )
}
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Nav, { Footer } from '../../components/Nav'
import BookCard from '../../components/BookCard'
import BookCardSkeleton from '../../components/BookCardSkeleton'
import { apiSearch } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import s from './SearchPage.module.css'

export default function SearchPage() {
    const { t } = useLang()
    const [params] = useSearchParams()
    const q = params.get("q") ?? ""

    // two tidy rows of five
    const { data, isLoading } = useQuery({
        queryKey: ["search", q, 10],
        queryFn: () => apiSearch(q, 10),
        enabled: q.trim().length > 0,
        staleTime: 5 * 60 * 1000,
    })

    const books = data?.books ?? []

    return (
        <>
            <Nav />
            <div className={s.page}>
                <p className={s.heading}>
                    {t("search_results_for")} <span>"{q}"</span>
                </p>
                {isLoading ? (
                    <div className={s.grid}>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <BookCardSkeleton key={i} />
                        ))}
                    </div>
                ) : books.length === 0 ? (
                    <p className={s.empty}>{t("search_nothing_found")}</p>
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
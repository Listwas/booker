import Nav from "../../components/Nav"
import { Footer } from "../../components/Nav"
import { useLang } from "../../lib/i18n"
import BookFeed, { RecommendedFeed } from "./BookFeed"
import s from "./Home.module.css"

export default function Home() {
    const { t } = useLang()
    return (
        <>
            <Nav />
            <div className={s.page_wrapper}>
                <RecommendedFeed />
                <BookFeed genre="fantasy" header={t("genre_fantasy")} />
                <BookFeed genre="science-fiction" header={t("genre_scifi")} />
                <BookFeed genre="mystery" header={t("genre_mystery")} />
                <BookFeed genre="horror" header={t("genre_horror")} />
            </div>
            <Footer />
        </>
    )
}
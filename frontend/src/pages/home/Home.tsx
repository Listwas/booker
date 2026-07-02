import Nav from "../../components/Nav"
import { Footer } from "../../components/Nav"
import BookFeed, { RecommendedFeed } from "./BookFeed"
import s from "./Home.module.css"

export default function Home() {
    return (
        <>
            <Nav />
            <div className={s.page_wrapper}>
                <RecommendedFeed />
                <BookFeed genre="fantasy" />
                <BookFeed genre="science-fiction" header="Sci-Fi" />
                <BookFeed genre="mystery" />
                <BookFeed genre="horror" />
            </div>
            <Footer />
        </>
    )
}
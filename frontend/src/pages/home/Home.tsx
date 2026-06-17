import Nav from "../../components/Nav"
import BookFeed from "./BookFeed"
import s from "./Home.module.css"

export default function Home() {
    return (
        <>
            <Nav />
            <div className={s.page_wrapper}>
                <BookFeed genre="fantasy" />
                <BookFeed genre="science-fiction" header="Sci-Fi" />
                <BookFeed genre="mystery" />
            </div>
        </>
    )
}
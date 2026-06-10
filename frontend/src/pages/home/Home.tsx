import Nav from "./components/nav/Nav"
import BookFeed from "./components/bookfeed/BookFeed"
import s from "./home.module.css"

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
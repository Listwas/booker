import Nav from './components/nav/Nav.tsx'
import BookFeed from './components/bookfeed/BookFeed.tsx'
import s from './home.module.css'

function Home() {
    return ( 
        <>
            <main className={s.main}>
                <div>
                    <Nav />
                    <div className={s.main_block} >
                        <BookFeed genre="fiction" />
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home;

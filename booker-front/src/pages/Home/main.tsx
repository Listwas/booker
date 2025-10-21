import Nav from './nav/Nav.tsx'
import BookFeed from './bookfeed/BookFeed.tsx'
import s from './home.module.css'

function Home() {
    return ( 
        <>
            <main className={s.main}>
                <div>
                    <Nav />
                    <div className={s.main_block} >
                        <BookFeed />
                    </div>
                </div>
            </main>
        </>
    )
}

export default Home;

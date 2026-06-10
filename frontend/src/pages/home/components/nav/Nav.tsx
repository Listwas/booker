import { Link } from 'react-router-dom'
import Search from './Search.tsx'
import s from './nav.module.css'

function Nav() {
    const toggleTheme = () => {
        const current = document.documentElement.getAttribute("data-theme")
        document.documentElement.setAttribute("data-theme", current === "light" ? "dark" : "light")
    }

    return (
        <div className={s.nav_outer}>
            <div className={s.nav_container}>
                <Link to="/" className={s.logo}>Booker</Link>

                <div className={s.middle_block}>
                    <Link to="/list" className={s.nav_link}>List</Link>
                    <Link to="/list" className={s.nav_link}>Profile</Link>
                    <Link to="/list" className={s.nav_link}>Friends</Link>
                    <Link to="/list" className={s.nav_link}>Reviews</Link>
                </div>

                <div className={s.right_block}>
                    <Search />
                    <button className={s.theme_btn} onClick={toggleTheme}>◑</button>
                </div>
            </div>
        </div>
    )
}

export default Nav
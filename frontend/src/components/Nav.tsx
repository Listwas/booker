import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import Search from './Search.tsx'
import s from './Nav.module.css'

function Nav() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const hasAccount = localStorage.getItem("hasAccount")

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute("data-theme")
        const next = current === "light" ? "dark" : "light"
        document.documentElement.setAttribute("data-theme", next)
        localStorage.setItem("theme", next)
    }

    const handleLogout = () => {
        logout()
        navigate("/", { replace: true })
    }

    const isActive = (path: string) => location.pathname === path ? s.active : ""

    return (
        <div className={s.nav_outer}>
            <div className={s.nav_container}>
                <div className={s.left_block}>
                    <Link to="/" className={s.logo}>booker</Link>
                    <Link to="/list" className={`${s.nav_link} ${isActive("/list")}`}>library</Link>
                    <Link to="/profile" className={`${s.nav_link} ${isActive("/profile")}`}>profile</Link>
                </div>

                <div className={s.right_block}>
                    <Search />
                    <button className={s.theme_btn} onClick={toggleTheme} aria-label="toggle theme">◑</button>
                    {user ? (
                        <>
                            <Link to="/profile" className={s.avatar_circle}>
                                {user.username.slice(0, 2).toUpperCase()}
                            </Link>
                            <button className={s.auth_btn} onClick={handleLogout}>logout</button>
                        </>
                    ) : (
                        <Link
                            to="/auth"
                            className={s.auth_btn}
                            state={{ mode: hasAccount ? "login" : "register" }}
                        >
                            {hasAccount ? "login" : "register"}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export function Footer() {
    return (
        <footer className={s.footer + " app-footer"}>
            booker · book data from{" "}
            <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">Open Library</a>{" "}
            · a thesis project
        </footer>
    )
}

export default Nav

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../context/AuthContext'
import Search from './Search.tsx'
import s from './nav.module.css'

function Nav() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const hasAccount = localStorage.getItem("hasAccount")

    const toggleTheme = () => {
        const current = document.documentElement.getAttribute("data-theme")
        document.documentElement.setAttribute("data-theme", current === "light" ? "dark" : "light")
    }

    const handleLogout = () => {
        logout()
        navigate("/")
    }

    return (
        <div className={s.nav_outer}>
            <div className={s.nav_container}>
                <Link to="/" className={s.logo}>Booker</Link>

                <div className={s.middle_block}>
                    <Link to="/list" className={s.nav_link}>List</Link>
                    <Link to="/profile" className={s.nav_link}>Profile</Link>
                    <Link to="/list" className={s.nav_link}>Friends</Link>
                    <Link to="/list" className={s.nav_link}>Reviews</Link>
                </div>

                <div className={s.right_block}>
                    <Search />
                    <button className={s.theme_btn} onClick={toggleTheme}>◑</button>

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

export default Nav
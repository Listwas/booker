import Search from './Search.tsx';
import { Link } from 'react-router-dom';
import s from './nav.module.css';

function Nav() {
    return (
        <>
            <div className={s.nav_container}>
                <div className={s.left_block}>
                    <Link to="/" className={s.no_decor}>
                        <span>Booker</span>
                    </Link>
                </div>

                <div className={s.middle_block}>
                    <Link to="/list" className={s.no_decor}>List</Link>
                    <Link to="/list" className={s.no_decor}>Profile</Link>
                    <Link to="/list" className={s.no_decor} >Friends</Link>
                    <Link to="/list" className={s.no_decor}>My reviews</Link>
                    <Link to="/list" className={s.no_decor}>Settings</Link>
                </div>

                <div className={s.right_block}> 
                    <Search />
                </div>
            </div>

        </>
    )
}

export default Nav;

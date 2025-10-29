import Search from './Search.tsx';
import LogoBox from './LogoBox.tsx';
import { Link } from 'react-router-dom';
import s from './nav.module.css';

function Nav() {
    return (
        <>
            <div className={s.nav_container}>
                <div className={s.left_block}>
                    <Link to="/"><LogoBox /></Link>
                </div>

                <div className={s.middle_block}>
                    <Link to="/list">List</Link>
                    <Link to="/list">Profile</Link>
                    <Link to="/list">Friends</Link>
                    <Link to="/list">My reviews</Link>
                    <Link to="/list">Settings</Link>
                </div>

                <div className={s.right_block}> 
                    <Search />
                </div>
            </div>

        </>
    )
}

export default Nav;

import Search from './search/Search.tsx'
import LogoBox from './logobox/LogoBox.tsx'
import s from './nav.module.css'

function Nav() {
    return (
        <>
            <div className={s.nav_container}>
                <div className={s.left_block}>
                    <LogoBox />
                </div>

                <div className={s.middle_block}>
                    <p>List</p>
                    <p>Profile</p>
                    <p>Friends</p>
                    <p>My reviews</p>
                    <p>Settings</p>
                </div>

                <div className={s.right_block}> 
                    <Search />
                </div>
            </div>

        </>
    )
}

export default Nav;

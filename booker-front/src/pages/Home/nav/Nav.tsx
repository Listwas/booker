import Search from './search/Search.tsx'
import LogoBox from './logobox/LogoBox.tsx'
import DropDownMenu from './drop-down-menu/DropDownMenu.tsx'
import s from './nav.module.css'

function Nav() {
    return (
        <>
            <div className={s.nav_container}>
                <div className={s.left_block}>
                    <LogoBox />
                </div>

                <div className={s.middle_block}>
                    <Search />
                </div>

                <div className={s.right_block}> 
                    <DropDownMenu />
                </div>
            </div>

        </>
    )
}

export default Nav;

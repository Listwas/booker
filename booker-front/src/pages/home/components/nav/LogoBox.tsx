import constants from '../../constants.json';
import styles from './logobox.module.css';

function LogoBox() {
    return (
        <>
            <div>
                <a className={styles.logo_text} href={constants.HOME_PAGE_LINK}>Booker</a>
            </div>
        </>
    );
}

export default LogoBox;

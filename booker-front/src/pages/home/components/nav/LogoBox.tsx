import constants from '../../constants.json';
import s from './logobox.module.css';

function LogoBox() {
    return (
        <>
            <div>
                <p className={s.logo_text}>Booker</p>
            </div>
        </>
    );
}

export default LogoBox;

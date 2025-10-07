import React from 'react';
import constants from '../../constants.json'

function LogoBox() {
    const logo_style: React.CSSProperties = {
        color: '#9400d3',
        marginLeft: '12px',
        fontSize: '2rem',
        fontWeight: 800,
        textDecoration: 'none',
        cursor: 'pointer',
    };

    return (
        <>
            <div>
                <a href={constants.HOME_PAGE_LINK} style={logo_style}>Booker</a>
            </div>
        </>
    );
}

export default LogoBox;

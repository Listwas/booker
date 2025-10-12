import styles from './search.module.css'

function Search() {
    return (
        <>
            <div className={styles.search_container}>
                <input className={styles.search} type="text" placeholder="type here" />

                <svg 
                    width="26" 
                    height="26" 
                    viewBox="0 0 26 26" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg">

                <circle 
                    cx="10" 
                    cy="10" 
                    r="9" 
                    stroke="black" 
                    stroke-width="2"/>

                <line 
                    x1="17.1213" 
                    y1="17" 
                    x2="24" 
                    y2="23.8787" 
                    stroke="black" 
                    stroke-width="3" 
                    stroke-linecap="round"/>
                </svg>
            </div>
        </>
    )
}

export default Search;

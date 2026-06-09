import styles from './search.module.css'

function Search() {
    return (
        <>
            <div className={styles.search_container}>
                <input 
                    autoFocus
                    className={styles.search} 
                    type="text" 
                    placeholder="search something" 
                />
            </div>
       </>
    )
}

export default Search;

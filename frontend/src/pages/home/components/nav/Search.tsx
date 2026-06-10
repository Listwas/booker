import styles from './search.module.css'

function Search() {
    return (
        <div className={styles.search_container}>
            <input
                className={styles.search}
                type="text"
                placeholder="search..."
            />
        </div>
    )
}

export default Search
import styles from './bookcard.module.css';

function BookCard({ title, author, cover }) {
    return(
        <>    
            <div className={styles.bookcard_container}>
                <div className={styles.cover_container}>
                    <img src={cover} alt={title} />
                </div>

                <div className={styles.info_card}>
                    <div className={styles.top_part}>
                        <span className={styles.star_svg}></span>
                        <span className={styles.rating_score}> 8.4 </span>
                        <span className={styles.rating_count}> (2134) </span>

                        <div className={styles.button_container}>
                            <button>+</button>
                        </div>
                    </div>

                    <div className={styles.bottom_part}>
                        <span> {author} </span>
                        <p> {title} </p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default BookCard;

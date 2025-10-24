
import styles from './bookcard.module.css';

function BookCardSkeleton() {
    return (
        <div className={`${styles.bookcard_container} ${styles.skeleton}`}>
            <div className={`${styles.cover_container} ${styles.skeleton_box}`}></div>
            <div className={styles.info_card}>
                <div className={`${styles.top_part} ${styles.skeleton_line}`}></div>
                <div className={`${styles.bottom_part}`}>
                    <div className={`${styles.skeleton_line} ${styles.short}`}></div>
                    <div className={`${styles.skeleton_line} ${styles.long}`}></div>
                </div>
            </div>
        </div>
    );
}

export default BookCardSkeleton;

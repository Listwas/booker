import { useEffect, useState, useRef } from 'react';
import styles from './bookfeed.module.css';
import BookCardSkeleton from './BookCardSkeleton.tsx'
import BookCard from './BookCard.tsx';

function BookFeed({ header, genre }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const carouselRef = useRef(null);

    const scroll = (direction) =>  {
        const container = carouselRef.current;
        const scrollAmount = 895; 
        container.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
        });
    }

    const scrollHandle = () => {
        const container = carouselRef.current;
        if (!container) return;

        const scrollWidthHalf = container.scrollWidth / 2;
        
        if (container.scrollLeft >= scrollWidthHalf) {
            container.scrollLeft -= scrollWidthHalf;
        } 
        else if (container.scrollLeft <= 0) {
            container.scrollLeft += scrollWidthHalf;
        } 
    }

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/books/${genre}`)
            .then(res => res.json())
            .then(data => {
                setBooks(data.books);
                setLoading(false);
            })
            .catch(error => {
                console.error("error fetching books:", error);
                setLoading(false); 
            });


    }, []);

    return (
        <div className={styles.main_block}>
            <h2>{header ? header : genre}</h2>
                
                <div className={styles.carousel_wrapper}>
                    <button
                        className={`${styles.scroll_button} ${styles.left_button}`}
                        onClick={() => scroll("left")}
                    >
                        ‹
                    </button>

                    <div className={styles.cards_carousel} ref={carouselRef} onScroll={scrollHandle}>
                    { loading ? (
                        Array.from({ length: 5 }).map((_, index) => <BookCardSkeleton key={index} />)
                    ) : (
                        [...books, ...books].map((book, index) => (
                            <BookCard 
                                key={index}
                                title={book.title}
                                author={book.author}
                                cover={book.cover}
                            />
                        ))
                    )}
                    </div>

                    <button
                        className={`${styles.scroll_button} ${styles.right_button}`}
                        onClick={() => scroll("right")}
                    >
                        ›
                    </button>
                </div> 
        </div>
    );
}

export default BookFeed;

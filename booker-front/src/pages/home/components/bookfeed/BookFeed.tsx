import { useEffect, useState } from 'react';
import styles from './bookfeed.module.css';
import BookCardSkeleton from './BookCardSkeleton.jsx'
import BookCard from './BookCard.jsx';

function BookFeed({ header, genre }) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

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
            <div className={styles.cards_carousel}>
                <div className={styles.group}>
                { loading ? (
                    Array.from({ length: 5 }).map((_, index) => <BookCardSkeleton key={index} />)
                ) : (    
                    books.map((book, index) => (
                        <BookCard 
                            key={index}
                            title={book.title}
                            author={book.author}
                            cover={book.cover}
                        />
                    ))
                )}
                </div>
            </div>
        </div>
    );
}

export default BookFeed;

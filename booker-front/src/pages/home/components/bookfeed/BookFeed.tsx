import { useEffect, useState } from 'react';
import styles from './bookfeed.module.css';
import BookCard from './BookCard.jsx';

function BookFeed() {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/books/fiction")
            .then(res => res.json())
            .then(data => setBooks(data.books));
    }, []);

  return (
        <div className={styles.main_block}>
            <h2>Fiction</h2>
            <div className={styles.cards_carousel}>
                <div className={styles.group}>
                    {books.map((book, index) => (
                        <BookCard 
                            key={index}
                            title={book.title}
                            author={book.author}
                            cover={book.cover}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BookFeed;

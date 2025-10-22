import {useEffect, useState } from 'react';
import styles from './bookfeed.module.css';
import BookCard from './BookCard.jsx';

function BookFeed() {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8000/books")
            .then(res => res.json())
            .then(data => {
                    console.log(data);
                    setBooks(data);
            });
    }, []);

  return (
    <div className={styles.main_block}>
        <h2>Fiction</h2>
        <div className={styles.book_cards_container}>
            <BookCard />
            
        </div>
    </div>
  );
}

export default BookFeed;

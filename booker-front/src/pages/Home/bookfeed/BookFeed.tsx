import {useEffect, useState } from 'react';

function BookFeed() {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8000/books")
            .then(res => res.json())
            .then(data => setBooks(data));
    }, []);

  return (
    <div>
      <h2>Book Feed</h2>
      {books.map((books, index) => (
        <div key={index}>
          <strong>{books.title}</strong> — {books.author}
        </div>
      ))}
    </div>
  );
}

export default BookFeed;

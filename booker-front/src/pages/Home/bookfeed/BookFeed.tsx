import { useState } from 'react';
import booksData from "./books.json";


function BookFeed() {
  const [books, setBooks] = useState(booksData);

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

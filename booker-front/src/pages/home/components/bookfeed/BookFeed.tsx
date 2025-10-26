import { useEffect, useState, useRef } from 'react';
import styles from './bookfeed.module.css';
import BookCardSkeleton from './BookCardSkeleton.tsx'
import BookCard from './BookCard.tsx';


interface Book{
    title: string;
    author: string;
    cover: string;
}

function BookFeed({ header, genre }: { header?: string; genre: string }) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const carouselRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        const container = carouselRef.current;
        const scrollAmount = 895;
        container?.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
        });
    };

    useEffect(() => {
        const fetchBooks = async () => {
          try {
              const response = await fetch(`http://127.0.0.1:8000/books/${genre}`);
              const data: Book[] = await response.json();
              setBooks(data.books)
          } catch (error) {
              console.error('error fetching books:', error);
          } finally {
              setLoading(false);
          }
        };
        fetchBooks();
    }, [genre]);

    if (loading) {
       return (
       <>        
           <div className={styles.main_block}>
               <h2>{header ? header : genre}</h2>
           </div>     
           <div className={styles.cards_carousel}>
               {Array.from({ length: 5 }).map((_, index) => (
                   <BookCardSkeleton key={index} />
                ))}
           </div>
       </>
       );
    }

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

                    <div className={styles.cards_carousel} ref={carouselRef} >
                    {books.map((book, index) => (
                            <BookCard 
                                key={index}
                                title={book.title}
                                author={book.author}
                                cover={book.cover}
                            />
                        ))
                    }
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

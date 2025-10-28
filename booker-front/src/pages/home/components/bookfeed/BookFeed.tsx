import { useEffect, useState, useRef } from 'react';
import styles from './bookfeed.module.css';
import BookCardSkeleton from './BookCardSkeleton.tsx'
import BookCard from './BookCard.tsx';

interface Book{
    title: string;
    author: string;
    cover: string;
}

const ITEM_WIDTH = 224 * 4;

function BookFeed({ header, genre }: { header?: string; genre: string }) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    
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


    const handleScroll = (scrollAmount) => {
        const lastCard = document.getElementsByClassName(styles.cards_carousel)[0].lastChild;
        const xOffset = lastCard.getBoundingClientRect().x;
        console.log('xoffset is', xOffset);
        if (xOffset < 3000 && scrollAmount > 0) {
            for (let i = 0; i < 4; i++) {
                books.push(books[books.length % 20]);
            }
            setBooks(books);
        };

        const newScrollPosition = scrollPosition + scrollAmount;
        setScrollPosition(newScrollPosition);
        containerRef.current.scrollLeft = newScrollPosition; 
    };


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
                        onClick={() => {handleScroll(-ITEM_WIDTH)}}
                    >
                        ‹
                    </button>

                    <div className={styles.cards_carousel} ref={containerRef} >
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
                        onClick={() => {handleScroll(ITEM_WIDTH)}}
                    >
                        ›
                    </button>
                </div> 
        </div>
    );
}

export default BookFeed;

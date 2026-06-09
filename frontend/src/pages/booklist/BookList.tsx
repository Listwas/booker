import s from './booklist.module.css';
import { Link } from 'react-router-dom';

function BookList() {
    return (
        <>
          <div className={s.page}>
              <div className={s.main_container}>
                  <div className={s.nav_container}> 
                      <Link to="/" className={s.logo_box}> 
                          Booker 
                      </Link>

                      <span className={s.current_book_list_msg}>
                          Viewing <strong>Your</strong> book list 
                      </span>
                  </div>

                <div className={s.content_box}>
                    <div className={s.statuses_box}>
                       <Link to="" className={s.statuses}>all statuses</Link>
                       <Link to="" className={s.statuses}>reading</Link>
                       <Link to="" className={s.statuses}>plan to read</Link>
                       <Link to="" className={s.statuses}>completed</Link>
                       <Link to="" className={s.statuses}>dropped</Link>
                       <Link to="" className={s.statuses}>on hold</Link>
                    </div> 

                    <div className={s.books_container}>
                        <div className={s.book_details}>
                            <p>cover</p>
                            <p>title</p>
                            <p>author</p>
                            <p>my rating</p>
                            <p>progress</p>
                        </div>
                    </div>
                </div>
            </div>
          </div> 
        </>
    );

}

export default BookList;

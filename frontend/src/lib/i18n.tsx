import { createContext, useContext, useState, useCallback } from "react"

// flat dictionaries + {var} interpolation

const en = {
    // nav
    nav_library: "library",
    nav_profile: "profile",
    nav_logout: "logout",
    nav_login: "login",
    nav_register: "register",

    // search
    search_placeholder: "search books...",
    search_searching: "searching…",
    search_no_results: "no results",
    search_all_results: 'all results for "{q}" ↵',
    search_results_for: "results for",
    search_nothing_found: "nothing found",

    // home feeds
    feed_picked: "picked for you",
    feed_because: "because you read {subjects}",
    feed_error: "couldn't load books, openlibrary might be down",
    feed_retry: "try again",
    genre_fantasy: "fantasy",
    genre_scifi: "sci-fi",
    genre_mystery: "mystery",
    genre_horror: "horror",

    // book cards
    card_no_ratings: "no ratings yet",
    card_in_library: "in your library",
    card_add: "add to library",
    toast_added: '"{title}" added to your library',
    toast_already: '"{title}" is already in your library',
    toast_add_failed: "Failed to add book",
    toast_login_to_add: "Please login to add books to your library",

    // book page
    back: "‹ back",
    book_load_error: "couldn't load this book. openlibrary might be slow, try again in a moment.",
    book_first_published: "first published:",
    book_ratings_from: "{count} {ratings} from {source} readers",
    ratings_one: "rating",
    ratings_few: "ratings",
    ratings_many: "ratings",
    source_booker: "booker",
    source_openlibrary: "open library",
    book_translate: "translate description",
    book_show_original: "show original",
    book_translating: "translating…",
    toast_translate_failed: "Translation is unavailable right now",
    book_translated_by: "machine translation · MyMemory",
    book_login_to_add: "login to add",
    book_adding: "adding…",
    book_already_link: "✓ already in your library, view list",
    entry_title: "your entry",
    entry_view_list: "view list ›",
    entry_my_rating: "my rating",
    entry_started: "started {date}",
    entry_finished: "finished {date}",
    entry_note_placeholder: "private notes about this book…",
    entry_save_note: "save note",
    toast_note_saved: "note saved",
    toast_update_failed: "Update failed",

    // library
    guest_title: "You're browsing a demo library",
    guest_sub: "This is what a booker library looks like. Create a free account to build your own, track reading, rate books, and keep a wishlist.",
    guest_cta: "create your library",
    guest_owner: "demo_reader's library",
    guest_readonly: "read-only",
    list_loading: "loading your library…",
    list_loading_demo: "loading demo…",
    list_empty_all: "your library is empty, add some books from the home page",
    list_empty_status: 'no books in "{status}" yet',
    col_book: "book",
    col_rating: "rating",
    col_pages: "pages",
    col_status: "status",
    col_actions: "actions",
    status_all: "all",
    status_reading: "reading",
    status_plan: "plan",
    status_completed: "completed",
    status_dropped: "dropped",
    status_hold: "hold",
    sort_by: "sort by",
    sort_recent: "recently added",
    sort_title: "title a-z",
    sort_author: "author a-z",
    sort_rating: "rating",
    refresh: "refresh",
    add_custom: "+ add custom",
    reread_badge: "reread #{n}",
    confirm_yes: "yes",
    confirm_no: "no",
    title_reread: "start reread",
    title_reset_reread: "reset reread count",
    title_remove: "remove",
    pages_read_ph: "0",
    pages_total_ph: "?",
    toast_removed: '"{title}" removed',
    toast_reread: '"{title}" reread started',
    toast_reread_reset: '"{title}" reread count reset',
    toast_remove_failed: "Failed to remove book",
    toast_reread_failed: "Failed to start reread",
    toast_reset_failed: "Failed to reset rereads",
    toast_status_changed: "status changed to {status}",

    // custom add modal
    modal_title: "add custom book",
    modal_book_title: "title *",
    modal_author: "author *",
    modal_cover: "cover url (optional)",

    // profile
    loading: "loading…",
    profile_logged_out: "you don't have an account yet. create one to build your own library, track reading and rate books.",
    profile_create_account: "create account",
    profile_stats: "library stats",
    stat_total: "total",
    stat_pages_read: "pages read",
    stat_hours_read: "hours read",
    stat_days_read: "days read",
    profile_chart: "books finished per month",
    profile_recent: "recently added",
    profile_account: "account",
    profile_books: "books finished: {n}",
    change_password: "change password",
    current_password_ph: "current password",
    new_password_ph: "new password (min 6)",
    save: "save",
    saving: "saving…",
    cancel: "cancel",
    export_csv: "export library (csv)",
    export_json: "export library (json)",
    toast_export_failed: "Export failed",
    delete_account: "delete account",
    confirm_delete: "confirm delete",
    deleting: "deleting…",
    password_ph: "password",
    toast_password_changed: "password changed",
    toast_password_failed: "Failed to change password",
    toast_account_deleted: "account deleted",
    toast_delete_failed: "Failed to delete account",
    change_banner: "change banner",
    change_avatar: "change",
    toast_avatar_updated: "avatar updated",
    toast_banner_updated: "banner updated",
    toast_image_failed: "Failed to update image",

    // auth
    auth_back: "‹ back to home",
    auth_tagline: "track what you read",
    auth_username: "username",
    auth_username_ph: "your_username",
    auth_email: "email",
    auth_email_ph: "you@example.com",
    auth_email_hint: "we'll never share your email",
    auth_password: "password",
    auth_password_hint: "at least 6 characters",
    auth_submit_register: "create account",
    auth_submit_login: "log in",
    auth_switch_to_login: "already have an account? ",
    auth_switch_to_register: "new to booker? ",
    auth_switch_login_btn: "log in",
    auth_switch_register_btn: "register",
    auth_err_username_min: "Username must be at least 3 characters",
    auth_err_username_max: "Username must be at most 24 characters",
    auth_err_username_chars: "Letters, numbers and underscores only",
    auth_err_email_required: "Email is required",
    auth_err_email_invalid: "Please enter a valid email address",
    auth_err_password_min: "Password must be at least 6 characters",
    auth_err_username_required: "Username is required",
    auth_err_password_required: "Password is required",
    auth_err_register_failed: "Registration failed, username or email may be taken",
    auth_err_login_failed: "Invalid username or password",
    auth_err_generic: "Something went wrong",
    toast_welcome: "Welcome to booker!",
    toast_welcome_back: "Welcome back!",
    toast_session_expired: "session expired, please log in again",

    // footer
    footer_data: "book data from",
    footer_thesis: "a thesis project",
}

const pl: typeof en = {
    nav_library: "biblioteka",
    nav_profile: "profil",
    nav_logout: "wyloguj",
    nav_login: "zaloguj",
    nav_register: "załóż konto",

    search_placeholder: "szukaj książek...",
    search_searching: "szukam…",
    search_no_results: "brak wyników",
    search_all_results: 'wszystkie wyniki dla "{q}" ↵',
    search_results_for: "wyniki dla",
    search_nothing_found: "nic nie znaleziono",

    feed_picked: "wybrane dla ciebie",
    feed_because: "bo czytasz {subjects}",
    feed_error: "nie udało się pobrać książek, openlibrary może nie działać",
    feed_retry: "spróbuj ponownie",
    genre_fantasy: "fantastyka",
    genre_scifi: "sci-fi",
    genre_mystery: "kryminał",
    genre_horror: "horror",

    card_no_ratings: "brak ocen",
    card_in_library: "w twojej bibliotece",
    card_add: "dodaj do biblioteki",
    toast_added: '"{title}" dodano do biblioteki',
    toast_already: '"{title}" jest już w twojej bibliotece',
    toast_add_failed: "Nie udało się dodać książki",
    toast_login_to_add: "Zaloguj się, żeby dodawać książki",

    back: "‹ wróć",
    book_load_error: "nie udało się wczytać książki. openlibrary bywa wolne, spróbuj za chwilę.",
    book_first_published: "pierwsze wydanie:",
    book_ratings_from: "{count} {ratings} od czytelników {source}",
    ratings_one: "ocena",
    ratings_few: "oceny",
    ratings_many: "ocen",
    source_booker: "booker",
    source_openlibrary: "open library",
    book_translate: "przetłumacz opis",
    book_show_original: "pokaż oryginał",
    book_translating: "tłumaczenie…",
    toast_translate_failed: "Tłumaczenie jest teraz niedostępne",
    book_translated_by: "tłumaczenie maszynowe · MyMemory",
    book_login_to_add: "zaloguj się, by dodać",
    book_adding: "dodawanie…",
    book_already_link: "✓ już w twojej bibliotece, zobacz listę",
    entry_title: "twój wpis",
    entry_view_list: "zobacz listę ›",
    entry_my_rating: "moja ocena",
    entry_started: "rozpoczęto {date}",
    entry_finished: "ukończono {date}",
    entry_note_placeholder: "prywatne notatki o tej książce…",
    entry_save_note: "zapisz notatkę",
    toast_note_saved: "notatka zapisana",
    toast_update_failed: "Nie udało się zapisać zmian",

    guest_title: "Przeglądasz bibliotekę demo",
    guest_sub: "Tak wygląda biblioteka w booker. Załóż darmowe konto, żeby zbudować własną, śledzić czytanie, oceniać książki i prowadzić listę życzeń.",
    guest_cta: "stwórz swoją bibliotekę",
    guest_owner: "biblioteka demo_reader",
    guest_readonly: "tylko do odczytu",
    list_loading: "wczytywanie biblioteki…",
    list_loading_demo: "wczytywanie demo…",
    list_empty_all: "twoja biblioteka jest pusta, dodaj książki ze strony głównej",
    list_empty_status: 'brak książek w "{status}"',
    col_book: "książka",
    col_rating: "ocena",
    col_pages: "strony",
    col_status: "status",
    col_actions: "akcje",
    status_all: "wszystkie",
    status_reading: "czytam",
    status_plan: "planuję",
    status_completed: "ukończone",
    status_dropped: "porzucone",
    status_hold: "wstrzymane",
    sort_by: "sortuj",
    sort_recent: "ostatnio dodane",
    sort_title: "tytuł a-z",
    sort_author: "autor a-z",
    sort_rating: "ocena",
    refresh: "odśwież",
    add_custom: "+ dodaj własną",
    reread_badge: "powtórka #{n}",
    confirm_yes: "tak",
    confirm_no: "nie",
    title_reread: "zacznij powtórkę",
    title_reset_reread: "wyzeruj powtórki",
    title_remove: "usuń",
    pages_read_ph: "0",
    pages_total_ph: "?",
    toast_removed: 'usunięto "{title}"',
    toast_reread: 'powtórka "{title}" rozpoczęta',
    toast_reread_reset: 'wyzerowano powtórki "{title}"',
    toast_remove_failed: "Nie udało się usunąć książki",
    toast_reread_failed: "Nie udało się zacząć powtórki",
    toast_reset_failed: "Nie udało się wyzerować powtórek",
    toast_status_changed: "status zmieniony na {status}",

    modal_title: "dodaj własną książkę",
    modal_book_title: "tytuł *",
    modal_author: "autor *",
    modal_cover: "url okładki (opcjonalnie)",

    loading: "wczytywanie…",
    profile_logged_out: "nie masz jeszcze konta. załóż je, żeby zbudować własną bibliotekę, śledzić czytanie i oceniać książki.",
    profile_create_account: "załóż konto",
    profile_stats: "statystyki biblioteki",
    stat_total: "łącznie",
    stat_pages_read: "przeczytane strony",
    stat_hours_read: "godziny czytania",
    stat_days_read: "dni czytania",
    profile_chart: "ukończone książki na miesiąc",
    profile_recent: "ostatnio dodane",
    profile_account: "konto",
    profile_books: "ukończone książki: {n}",
    change_password: "zmień hasło",
    current_password_ph: "obecne hasło",
    new_password_ph: "nowe hasło (min 6)",
    save: "zapisz",
    saving: "zapisywanie…",
    cancel: "anuluj",
    export_csv: "eksport biblioteki (csv)",
    export_json: "eksport biblioteki (json)",
    toast_export_failed: "Eksport nie powiódł się",
    delete_account: "usuń konto",
    confirm_delete: "potwierdź usunięcie",
    deleting: "usuwanie…",
    password_ph: "hasło",
    toast_password_changed: "hasło zmienione",
    toast_password_failed: "Nie udało się zmienić hasła",
    toast_account_deleted: "konto usunięte",
    toast_delete_failed: "Nie udało się usunąć konta",
    change_banner: "zmień banner",
    change_avatar: "zmień",
    toast_avatar_updated: "awatar zaktualizowany",
    toast_banner_updated: "banner zaktualizowany",
    toast_image_failed: "Nie udało się zapisać obrazka",

    auth_back: "‹ wróć na stronę główną",
    auth_tagline: "śledź co czytasz",
    auth_username: "nazwa użytkownika",
    auth_username_ph: "twoja_nazwa",
    auth_email: "email",
    auth_email_ph: "ty@przyklad.com",
    auth_email_hint: "nigdy nie udostępnimy twojego emaila",
    auth_password: "hasło",
    auth_password_hint: "co najmniej 6 znaków",
    auth_submit_register: "załóż konto",
    auth_submit_login: "zaloguj się",
    auth_switch_to_login: "masz już konto? ",
    auth_switch_to_register: "nowy w booker? ",
    auth_switch_login_btn: "zaloguj się",
    auth_switch_register_btn: "załóż konto",
    auth_err_username_min: "Nazwa musi mieć co najmniej 3 znaki",
    auth_err_username_max: "Nazwa może mieć najwyżej 24 znaki",
    auth_err_username_chars: "Tylko litery, cyfry i podkreślenia",
    auth_err_email_required: "Email jest wymagany",
    auth_err_email_invalid: "Podaj poprawny adres email",
    auth_err_password_min: "Hasło musi mieć co najmniej 6 znaków",
    auth_err_username_required: "Nazwa użytkownika jest wymagana",
    auth_err_password_required: "Hasło jest wymagane",
    auth_err_register_failed: "Rejestracja nie powiodła się, nazwa lub email mogą być zajęte",
    auth_err_login_failed: "Błędna nazwa użytkownika lub hasło",
    auth_err_generic: "Coś poszło nie tak",
    toast_welcome: "Witaj w booker!",
    toast_welcome_back: "Witaj z powrotem!",
    toast_session_expired: "sesja wygasła, zaloguj się ponownie",

    footer_data: "dane o książkach z",
    footer_thesis: "projekt inżynierski",
}

// backend error messages worth showing in polish
const backendPl: Record<string, string> = {
    "Book already in your list": "Ta książka jest już na twojej liście",
    "Username taken": "Nazwa użytkownika zajęta",
    "Email already registered": "Ten email jest już zarejestrowany",
    "Invalid credentials": "Błędne dane logowania",
    "Wrong password": "Błędne hasło",
    "Progress cannot exceed total pages": "Postęp nie może przekraczać liczby stron",
    "Too many failed logins, try again later": "Za dużo nieudanych logowań, spróbuj później",
    "couldn't reach openlibrary": "brak połączenia z openlibrary",
}

const dictionaries = { en, pl }

export type Lang = keyof typeof dictionaries
export type TKey = keyof typeof en

interface LangContextType {
    lang: Lang
    setLang: (l: Lang) => void
    t: (key: TKey, vars?: Record<string, string | number>) => string
    te: (backendMessage: string) => string
}

const LangContext = createContext<LangContextType>(null!)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() =>
        localStorage.getItem("lang") === "en" ? "en" : "pl"
    )

    const setLang = useCallback((l: Lang) => {
        localStorage.setItem("lang", l)
        setLangState(l)
    }, [])

    const t = useCallback(
        (key: TKey, vars?: Record<string, string | number>) => {
            let out: string = dictionaries[lang][key] ?? en[key] ?? key
            if (vars) {
                for (const [k, v] of Object.entries(vars)) {
                    out = out.replace(`{${k}}`, String(v))
                }
            }
            return out
        },
        [lang]
    )

    const te = useCallback(
        (msg: string) => (lang === "pl" ? backendPl[msg] ?? msg : msg),
        [lang]
    )

    return (
        <LangContext.Provider value={{ lang, setLang, t, te }}>
            {children}
        </LangContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLang = () => useContext(LangContext)

// eslint-disable-next-line react-refresh/only-export-components
export function pluralRatings(n: number, t: LangContextType["t"]): string {
    if (n === 1) return t("ratings_one")
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t("ratings_few")
    return t("ratings_many")
}

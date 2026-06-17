import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/home/Home.tsx'
import BookList from './pages/booklist/BookList.tsx'
import Auth from './pages/auth/Auth.tsx'
import Profile from './pages/profile/Profile.tsx'
import SearchPage from './pages/searchpage/SearchPage.tsx'
import BookPage from './pages/bookpage/BookPage.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/list" element={<BookList />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/book/:workId" element={<BookPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
)
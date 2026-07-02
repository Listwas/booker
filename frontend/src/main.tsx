import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/home/Home.tsx'
import './index.css'

// home is the landing page, the rest load on first visit
const BookList = lazy(() => import('./pages/booklist/BookList.tsx'))
const Auth = lazy(() => import('./pages/auth/Auth.tsx'))
const Profile = lazy(() => import('./pages/profile/Profile.tsx'))
const SearchPage = lazy(() => import('./pages/searchpage/SearchPage.tsx'))
const BookPage = lazy(() => import('./pages/bookpage/BookPage.tsx'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min
      gcTime: 30 * 60 * 1000,     // 30 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/list" element={<BookList />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/book/:workId" element={<BookPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
)

// Shared types for the Booker frontend

export type BookStatus = "reading" | "plan" | "completed" | "dropped" | "hold"

export interface UserBook {
  id: number
  user_id: number
  title: string
  author: string
  cover: string
  status: BookStatus
  rating: number | null
  progress: number | null
  total_pages: number | null
  rereads: number
  work_id: string | null
  note: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string | null
  updated_at: string | null
  community?: CommunityRating | null
}

export interface AuthUser {
  username: string
  email: string
  avatar?: string | null
  banner?: string | null
}

export interface ListIds {
  work_ids: (string | null)[]
  titles: string[]
  authors: string[]
}

// booker average, or open library's when nobody here rated it
export interface CommunityRating {
  rating: number | null
  count: number
  source?: "booker" | "openlibrary" | null
}

export interface OpenLibraryBook {
  title: string
  author: string
  cover: string
  work_id: string
  community: CommunityRating
}

export interface BookDetail {
  title: string
  authors: string[]
  cover: string
  description: string
  subjects: string[]
  first_publish_year: string
  work_id: string
  community: CommunityRating
}

export interface ProfileStats {
  total: number
  reading: number
  completed: number
  plan: number
  dropped: number
  hold: number
  total_pages_read: number
  reading_time_hours: number
  reading_time_days: number
}

export interface MonthlyStat {
  month: string
  books: number
  pages: number
}

export interface ProfileData {
  username: string
  email: string
  avatar?: string | null
  banner?: string | null
  stats: ProfileStats
  monthly?: MonthlyStat[]
}

export const STATUSES: { key: BookStatus | "all"; color: string }[] = [
  { key: "all", color: "" },
  { key: "reading", color: "#3b82f6" },
  { key: "plan", color: "#6b7280" },
  { key: "completed", color: "#22c55e" },
  { key: "dropped", color: "#ef4444" },
  { key: "hold", color: "#f59e0b" },
]

export const STATUS_COLORS: Record<BookStatus, string> = {
  reading: "#3b82f6",
  plan: "#6b7280",
  completed: "#22c55e",
  dropped: "#ef4444",
  hold: "#f59e0b",
}
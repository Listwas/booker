import type { UserBook, OpenLibraryBook, BookDetail, ListIds, ProfileData } from "./types"

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null; contentType?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) {
    headers["Content-Type"] = opts.contentType ?? "application/json"
  }
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`

  const body =
    opts.body === undefined
      ? undefined
      : opts.contentType === "application/x-www-form-urlencoded"
      ? (opts.body as URLSearchParams)
      : JSON.stringify(opts.body)

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data.detail || message
    } catch {
      // ignore parse errors
    }
    // expired/invalid token mid-session, AuthProvider listens and logs out
    if (res.status === 401 && path !== "/login") {
      window.dispatchEvent(new Event("auth-expired"))
    }
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

export const apiLogin = (username: string, password: string) =>
  api<{ access_token: string; token_type: string }>("/login", {
    method: "POST",
    body: new URLSearchParams({ username, password }),
    contentType: "application/x-www-form-urlencoded",
  })

export const apiRegister = (username: string, email: string, password: string) =>
  api<{ message: string; username: string; email: string }>("/register", {
    method: "POST",
    body: { username, email, password },
  })

export const apiMe = (token: string) => api<{ username: string; email: string }>("/me", { token })

export const apiListIds = (token: string) => api<ListIds>("/list/ids", { token })

export const apiList = (token: string, status = "all") =>
  api<UserBook[]>(`/list?status=${status}`, { token })

export const apiProfile = (token: string) => api<ProfileData>("/profile", { token })

export const apiAddBook = (token: string, body: Partial<UserBook>) =>
  api<UserBook>("/list", { method: "POST", body, token })

// rating: null in a patch means "not provided", clearing needs its own flag
export type BookPatch = Partial<
  Pick<UserBook, "status" | "rating" | "progress" | "total_pages" | "work_id" | "note">
> & { clear_rating?: boolean }

export const apiPatchBook = (token: string, id: number, body: BookPatch) =>
  api<UserBook>(`/list/${id}`, { method: "PATCH", body, token })

export const apiDeleteBook = (token: string, id: number) =>
  api<{ message: string }>(`/list/${id}`, { method: "DELETE", token })

export const apiReread = (token: string, id: number) =>
  api<UserBook>(`/list/${id}/reread`, { method: "POST", token })

export const apiResetReread = (token: string, id: number) =>
  api<UserBook>(`/list/${id}/reset-reread`, { method: "POST", token })

export const apiGenre = (genre: string) =>
  api<{ books: OpenLibraryBook[] }>(`/books/${genre}`)

export const apiSearch = (q: string, limit = 20) =>
  api<{ books: OpenLibraryBook[] }>(`/search?q=${encodeURIComponent(q)}&limit=${limit}`)

export const apiBook = (workId: string) =>
  api<BookDetail>(`/book/${workId}`)

export const apiBookMeta = (workId: string) =>
  api<{ total_pages: number | null }>(`/book/${workId}/metadata`)

export const apiRecommendations = (token: string) =>
  api<{ books: OpenLibraryBook[]; based_on: string[] }>("/recommendations", { token })

export const apiDeleteAccount = (token: string, password: string) =>
  api<{ message: string }>("/me/delete", { method: "POST", body: { password }, token })

// raw fetch, the response is a file download not json
export const apiExport = async (token: string, format: "json" | "csv") => {
  const res = await fetch(`${API_BASE}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`)
  return res.blob()
}

export const apiSeed = (token: string) =>
  api<{ message: string }>("/seed", { method: "POST", token })

export const apiDemo = () =>
  api<{ profile: ProfileData; books: UserBook[] }>("/demo")
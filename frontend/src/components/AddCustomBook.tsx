import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import s from './addcustombook.module.css'

interface Props {
    onClose: () => void
    onAdded: () => void
}

export default function AddCustomBook({ onClose, onAdded }: Props) {
    const { token } = useAuth()
    const { showToast } = useToast()
    const [title, setTitle] = useState("")
    const [author, setAuthor] = useState("")
    const [cover, setCover] = useState("")

    const submit = async () => {
        if (!title.trim() || !author.trim()) return
        const res = await fetch("http://127.0.0.1:8000/list", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                author,
                cover: cover || "https://covers.openlibrary.org/b/id/0-M.jpg",
                status: "plan",
                rating: null,
                progress: null
            })
        })
        if (res.ok) {
            showToast(`"${title}" added to list`)
            onAdded()
            onClose()
        }
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") submit()
        if (e.key === "Escape") onClose()
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>
                <div className={s.header}>
                    <span className={s.modal_title}>add custom book</span>
                    <button className={s.close_btn} onClick={onClose}>✕</button>
                </div>

                <input name="title" placeholder="title *" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={handleKey} />
                <input name="author" placeholder="author *" value={author} onChange={e => setAuthor(e.target.value)} onKeyDown={handleKey} />
                <input name="cover" placeholder="cover url (optional)" value={cover} onChange={e => setCover(e.target.value)} onKeyDown={handleKey} />

                <button className={s.submit_btn} onClick={submit}>add to list</button>
            </div>
        </div>
    )
}
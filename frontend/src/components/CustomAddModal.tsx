import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiAddBook } from '../lib/api'
import s from './CustomAddModal.module.css'

interface Props {
    onClose: () => void
    onAdded: () => void
}

export default function AddCustomBook({ onClose, onAdded }: Props) {
    const { token } = useAuth()
    const { showToast } = useToast()
    const qc = useQueryClient()
    const [title, setTitle] = useState("")
    const [author, setAuthor] = useState("")
    const [cover, setCover] = useState("")

    const mutation = useMutation({
        mutationFn: () =>
            apiAddBook(token!, {
                title: title.trim(),
                author: author.trim(),
                cover: cover.trim(),
                status: "plan",
            }),
        onSuccess: async () => {
            showToast(`"${title.trim()}" added to your library`)
            await qc.invalidateQueries({ queryKey: ["list"] })
            await qc.invalidateQueries({ queryKey: ["listIds"] })
            await qc.invalidateQueries({ queryKey: ["profile"] })
            onAdded()
            onClose()
        },
        onError: () => showToast("Failed to add book"),
    })

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && title.trim() && author.trim()) mutation.mutate()
        if (e.key === "Escape") onClose()
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={(e) => e.stopPropagation()}>
                <div className={s.header}>
                    <span className={s.modal_title}>add custom book</span>
                    <button className={s.close_btn} onClick={onClose}>✕</button>
                </div>

                <input
                    name="title"
                    placeholder="title *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKey}
                />
                <input
                    name="author"
                    placeholder="author *"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    onKeyDown={handleKey}
                />
                <input
                    name="cover"
                    placeholder="cover url (optional)"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    onKeyDown={handleKey}
                />

                <button
                    className={s.submit_btn}
                    onClick={() => mutation.mutate()}
                    disabled={!title.trim() || !author.trim() || mutation.isPending}
                >
                    {mutation.isPending ? "adding…" : "add to library"}
                </button>
            </div>
        </div>
    )
}
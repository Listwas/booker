import s from './StarRating.module.css'

interface StarRatingProps {
    value: number | null
    onChange?: (v: number | null) => void
    readonly?: boolean
    size?: number
}

export default function StarRating({ value, onChange, readonly = false, size = 16 }: StarRatingProps) {
    const display = value ?? 0

    const handleClick = (rating: number) => {
        if (readonly) return
        // toggle off if clicking the same value
        onChange?.(value === rating ? null : rating)
    }

    return (
        <div className={s.s} role={readonly ? "img" : "radiogroup"} aria-label={`Rating ${display} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => {
                const fillPct = Math.max(0, Math.min(1, display - (i - 1))) * 100
                return (
                    <span
                        key={i}
                        className={`${s.star} ${readonly ? "" : s.clickable}`}
                        onClick={() => handleClick(i)}
                        style={{ fontSize: `${size}px` }}
                    >
                        <span aria-hidden>★</span>
                        <span className={s.fill} style={{ width: `${fillPct}%` }} aria-hidden>★</span>
                    </span>
                )
            })}
        </div>
    )
}

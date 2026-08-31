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
        <div
            className={s.s}
            role={readonly ? "img" : undefined}
            aria-label={readonly ? `Rating ${display} out of 5` : undefined}
        >
            {[1, 2, 3, 4, 5].map((i) => {
                const fillPct = Math.max(0, Math.min(1, display - (i - 1))) * 100
                const star = (
                    <>
                        <span aria-hidden>★</span>
                        <span className={s.fill} style={{ width: `${fillPct}%` }} aria-hidden>★</span>
                    </>
                )

                if (readonly) {
                    return (
                        <span key={i} className={s.star} style={{ fontSize: `${size}px` }}>
                            {star}
                        </span>
                    )
                }

                return (
                    <button
                        key={i}
                        type="button"
                        className={`${s.star} ${s.clickable}`}
                        style={{ fontSize: `${size}px` }}
                        onClick={() => handleClick(i)}
                        aria-pressed={display >= i}
                        aria-label={`Rate ${i} out of 5`}
                    >
                        {star}
                    </button>
                )
            })}
        </div>
    )
}

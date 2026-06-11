import s from './starrating.module.css'

interface StarRatingProps {
    value: number | null
    onChange?: (v: number) => void
    readonly?: boolean
}

export default function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
    return (
        <div className={s.stars}>
            {[1, 2, 3, 4, 5].map(i => (
                <span
                    key={i}
                    className={`${s.star} ${value && i <= value ? s.filled : ""} ${readonly ? "" : s.clickable}`}
                    onClick={() => !readonly && onChange?.(i)}
                >
                    ★
                </span>
            ))}
        </div>
    )
}
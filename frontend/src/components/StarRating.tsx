import s from './StarRating.module.css'
import { useLang } from '../lib/i18n'

interface StarRatingProps {
    value: number | null
    onChange?: (v: number | null) => void
    readonly?: boolean
    size?: number
}

export default function StarRating({ value, onChange, readonly = false, size = 16 }: StarRatingProps) {
    const { t } = useLang()
    const display = value ?? 0

    const handleClick = (rating: number) => {
        if (readonly) return
        // toggle off if clicking the same value
        onChange?.(value === rating ? null : rating)
    }

    return (
        <div
            className={s.control}
            role={readonly ? "img" : undefined}
            aria-label={readonly ? `Rating ${display} out of 5` : undefined}
        >
            <div className={s.s}>{[1, 2, 3, 4, 5].map((i) => {
                const fillPct = Math.max(0, Math.min(1, display - (i - 1))) * 100
                const star = (
                    <span className={s.glyph}>
                        <span aria-hidden>★</span>
                        <span className={s.fill} style={{ width: `${fillPct}%` }} aria-hidden>★</span>
                    </span>
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
                        aria-label={t("rating_set", { value: i })}
                    >
                        {star}
                    </button>
                )
            })}</div>
            {!readonly && (
                <select className={s.value} value={value ?? ""} aria-label={t("entry_my_rating")}
                    onChange={(event) => onChange?.(event.target.value === "" ? null : Number(event.target.value))}>
                    <option value="">{t("rating_none")}</option>
                    {value !== null && value * 2 % 1 !== 0 && <option value={value}>{value}</option>}
                    {Array.from({ length: 11 }, (_, i) => i / 2).map((rating) => (
                        <option key={rating} value={rating}>{rating}</option>
                    ))}
                </select>
            )}
        </div>
    )
}

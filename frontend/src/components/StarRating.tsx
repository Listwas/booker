import { useEffect, useState } from 'react'
import s from './starrating.module.css'

interface StarRatingProps {
    value: number | null
    onChange?: (v: number) => void
    readonly?: boolean
}

export default function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
    const [internalValue, setInternalValue] = useState<number | null>(value)

    useEffect(() => {
        setInternalValue(value)
    }, [value])

    const handleClick = (rating: number) => {
        if (readonly) return
        setInternalValue(rating)
        onChange?.(rating)
    }

    return (
        <div className={s.stars}>
            {[1, 2, 3, 4, 5].map(i => (
                <span
                    key={i}
                    className={`${s.star} ${internalValue && i <= internalValue ? s.filled : ""} ${readonly ? "" : s.clickable}`}
                    onClick={() => handleClick(i)}
                >
                    ★
                </span>
            ))}
        </div>
    )
}
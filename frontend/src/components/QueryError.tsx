import { useLang } from "../lib/i18n"
import s from "./QueryError.module.css"

export default function QueryError({ onRetry }: { onRetry: () => void }) {
    const { t } = useLang()
    return (
        <div className={s.error} role="alert">
            <p>{t("load_failed")}</p>
            <button type="button" onClick={onRetry}>{t("feed_retry")}</button>
        </div>
    )
}

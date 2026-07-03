import { useMemo, useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api"
import { useLang } from "../../lib/i18n"
import s from "./Auth.module.css"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function buildSchemas(t: ReturnType<typeof useLang>["t"]) {
    const registerSchema = z.object({
        username: z
            .string()
            .trim()
            .min(3, t("auth_err_username_min"))
            .max(24, t("auth_err_username_max"))
            .regex(/^[a-zA-Z0-9_]+$/, t("auth_err_username_chars")),
        email: z
            .string()
            .trim()
            .min(1, t("auth_err_email_required"))
            .refine((v) => EMAIL_RE.test(v), t("auth_err_email_invalid")),
        password: z.string().min(6, t("auth_err_password_min")),
    })

    const loginSchema = z.object({
        username: z.string().trim().min(1, t("auth_err_username_required")),
        email: z.string().optional(),
        password: z.string().min(1, t("auth_err_password_required")),
    })

    return { registerSchema, loginSchema }
}

type Schemas = ReturnType<typeof buildSchemas>
type RegisterForm = z.infer<Schemas["registerSchema"]>
type LoginForm = z.infer<Schemas["loginSchema"]>

export default function Auth() {
    const location = useLocation()
    const initialMode = location.state?.mode ?? "register"
    const [mode, setMode] = useState<"login" | "register">(initialMode)
    const [serverError, setServerError] = useState("")

    const { login, register: registerFn } = useAuth()
    const { t, lang } = useLang()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const isRegister = mode === "register"

    // eslint-disable-next-line react-hooks/exhaustive-deps -- schemas depend on the language, t is stable per lang
    const { registerSchema, loginSchema } = useMemo(() => buildSchemas(t), [lang])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RegisterForm & LoginForm>({
        resolver: zodResolver(isRegister ? registerSchema : loginSchema) as never,
        defaultValues: { username: "", email: "", password: "" },
    })

    const switchMode = (m: "login" | "register") => {
        setMode(m)
        setServerError("")
        reset({ username: "", email: "", password: "" })
    }

    const onSubmit = async (values: RegisterForm & LoginForm) => {
        setServerError("")
        try {
            if (isRegister) {
                const ok = await registerFn(values.username, values.email ?? "", values.password)
                if (!ok) {
                    setServerError(t("auth_err_register_failed"))
                    return
                }
                showToast(t("toast_welcome"))
            } else {
                const ok = await login(values.username, values.password)
                if (!ok) {
                    setServerError(t("auth_err_login_failed"))
                    return
                }
                showToast(t("toast_welcome_back"))
            }
            navigate("/")
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : t("auth_err_generic"))
        }
    }

    return (
        <>
            <div className={s.page}>
                <div className={s.column}>
                    <Link to="/" className={s.back}>{t("auth_back")}</Link>

                    <div className={s.box}>
                        <div className={s.brand}>
                            <Link to="/" className={s.logo}>booker</Link>
                            <p className={s.tagline}>{t("auth_tagline")}</p>
                        </div>

                        <div className={s.toggle}>
                        <button
                            type="button"
                            onClick={() => switchMode("login")}
                            className={mode === "login" ? s.active : ""}
                        >
                            {t("nav_login")}
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode("register")}
                            className={mode === "register" ? s.active : ""}
                        >
                            {t("nav_register")}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className={s.field}>
                            <label htmlFor="username">{t("auth_username")}</label>
                            <input
                                id="username"
                                placeholder={t("auth_username_ph")}
                                {...register("username")}
                                disabled={isSubmitting}
                                className={errors.username ? s.invalid : ""}
                            />
                            {errors.username && (
                                <p className={s.error}>{errors.username.message}</p>
                            )}
                        </div>

                        {isRegister && (
                            <div className={s.field}>
                                <label htmlFor="email">{t("auth_email")}</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder={t("auth_email_ph")}
                                    {...register("email")}
                                    disabled={isSubmitting}
                                    className={errors.email ? s.invalid : ""}
                                />
                                {errors.email ? (
                                    <p className={s.error}>{errors.email.message}</p>
                                ) : (
                                    <p className={s.hint}>{t("auth_email_hint")}</p>
                                )}
                            </div>
                        )}

                        <div className={s.field}>
                            <label htmlFor="password">{t("auth_password")}</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                {...register("password")}
                                disabled={isSubmitting}
                                className={errors.password ? s.invalid : ""}
                            />
                            {errors.password ? (
                                <p className={s.error}>{errors.password.message}</p>
                            ) : isRegister ? (
                                <p className={s.hint}>{t("auth_password_hint")}</p>
                            ) : null}
                        </div>

                        {serverError && <p className={`${s.error} ${s.server_error}`}>{serverError}</p>}

                        <button
                            type="submit"
                            className={s.submit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "..." : isRegister ? t("auth_submit_register") : t("auth_submit_login")}
                        </button>
                    </form>

                    <p className={s.switch_text}>
                        {isRegister ? t("auth_switch_to_login") : t("auth_switch_to_register")}
                        <button onClick={() => switchMode(isRegister ? "login" : "register")}>
                            {isRegister ? t("auth_switch_login_btn") : t("auth_switch_register_btn")}
                        </button>
                    </p>
                    </div>
                </div>
            </div>
        </>
    )
}

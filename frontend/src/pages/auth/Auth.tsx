import { useState } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api"
import s from "./Auth.module.css"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const registerSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(24, "Username must be at most 24 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .refine((v) => EMAIL_RE.test(v), "Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

const loginSchema = z.object({
    username: z.string().trim().min(1, "Username is required"),
    email: z.string().optional(),
    password: z.string().min(1, "Password is required"),
})

type RegisterForm = z.infer<typeof registerSchema>
type LoginForm = z.infer<typeof loginSchema>

export default function Auth() {
    const location = useLocation()
    const initialMode = location.state?.mode ?? "register"
    const [mode, setMode] = useState<"login" | "register">(initialMode)
    const [serverError, setServerError] = useState("")

    const { login, register: registerFn } = useAuth()
    const { showToast } = useToast()
    const navigate = useNavigate()
    const isRegister = mode === "register"

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
                    setServerError("Registration failed — username or email may be taken")
                    return
                }
                showToast("Welcome to booker!")
            } else {
                const ok = await login(values.username, values.password)
                if (!ok) {
                    setServerError("Invalid username or password")
                    return
                }
                showToast("Welcome back!")
            }
            navigate("/")
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : "Something went wrong")
        }
    }

    return (
        <>
            <div className={s.page}>
                <div className={s.box}>
                    <Link to="/" className={s.logo}>Booker</Link>

                    <div className={s.toggle}>
                        <button
                            type="button"
                            onClick={() => switchMode("login")}
                            className={mode === "login" ? s.active : ""}
                        >
                            login
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode("register")}
                            className={mode === "register" ? s.active : ""}
                        >
                            register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className={s.field}>
                            <label htmlFor="username">username</label>
                            <input
                                id="username"
                                placeholder="your_username"
                                {...register("username")}
                                disabled={isSubmitting}
                                className={errors.username ? s.invalid : ""}
                            />
                            {errors.username && (
                                <p className={s.error}>{errors.username.message}</p>
                            )}
                        </div>

                        {isRegister && (
                            <div className={s.field} style={{ marginTop: "12px" }}>
                                <label htmlFor="email">email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    {...register("email")}
                                    disabled={isSubmitting}
                                    className={errors.email ? s.invalid : ""}
                                />
                                {errors.email ? (
                                    <p className={s.error}>{errors.email.message}</p>
                                ) : (
                                    <p className={s.hint}>we'll never share your email</p>
                                )}
                            </div>
                        )}

                        <div className={s.field} style={{ marginTop: "12px" }}>
                            <label htmlFor="password">password</label>
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
                                <p className={s.hint}>at least 6 characters</p>
                            ) : null}
                        </div>

                        {serverError && <p className={s.error} style={{ marginTop: "10px" }}>{serverError}</p>}

                        <button
                            type="submit"
                            className={s.submit}
                            disabled={isSubmitting}
                            style={{ width: "100%" }}
                        >
                            {isSubmitting ? "..." : isRegister ? "create account" : "log in"}
                        </button>
                    </form>

                    <p className={s.switch_text}>
                        {isRegister ? "already have an account? " : "new to booker? "}
                        <button onClick={() => switchMode(isRegister ? "login" : "register")}>
                            {isRegister ? "log in" : "register"}
                        </button>
                    </p>
                </div>
            </div>
        </>
    )
}

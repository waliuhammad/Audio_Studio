"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/navbar/Logo";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Mail,
    ShieldCheck,
} from "lucide-react";

import { describeAuthError, sendResetEmail } from "@/lib/firebase/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmed = email.trim();

        if (!trimmed) {
            setError("Enter the email address you signed up with.");
            return;
        }

        if (!EMAIL_PATTERN.test(trimmed)) {
            setError("That doesn't look like a valid email address.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await sendResetEmail(trimmed);

            setIsSent(true);
        } catch (error) {
            /**
             * auth/user-not-found is swallowed on purpose.
             *
             * Reporting "no account with that email" here would turn this form
             * into a way to test which addresses are registered. Firebase sends
             * nothing for an unknown address, so showing the same confirmation
             * either way costs the real user nothing.
             */
            const code =
                typeof error === "object" && error !== null && "code" in error
                    ? String((error as { code: unknown }).code)
                    : "";

            if (code === "auth/user-not-found" || code === "auth/invalid-email") {
                setIsSent(true);
            } else {
                setError(describeAuthError(error));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden">
            {/* ================================================= */}
            {/* AMBIENT GLOWS                                     */}
            {/* ================================================= */}

            <div
                aria-hidden="true"
                className="
          pointer-events-none
          absolute
          -left-44
          top-[-120px]
          h-80
          w-80
          rounded-full
          bg-amber/[0.05]
          blur-[110px]
          sm:h-96
          sm:w-96
        "
            />

            <div
                aria-hidden="true"
                className="
          pointer-events-none
          absolute
          -right-44
          bottom-[-140px]
          h-80
          w-80
          rounded-full
          bg-amber/[0.04]
          blur-[110px]
          sm:h-96
          sm:w-96
        "
            />

            <div className="container-studio relative flex flex-1 items-center justify-center py-14 sm:py-20">
                <div className="w-full max-w-md animate-fade-up">
                    <div className="flex justify-center pb-7 sm:pb-8">
                        <Logo />
                    </div>

                    <div
                        className="
              relative
              overflow-hidden
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-5
              py-6
              shadow-[0_20px_60px_rgba(0,0,0,0.07)]
              sm:px-8
              sm:py-8
              dark:border-ink-border
              dark:bg-ink-surface
              dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)]
            "
                    >
                        {/* Top highlight */}
                        <div
                            aria-hidden="true"
                            className="
                pointer-events-none
                absolute
                left-1/2
                top-0
                h-px
                w-32
                -translate-x-1/2
                bg-amber/50
                blur-[1px]
                sm:w-48
              "
                        />

                        {isSent ? (
                            /* ========================================= */
                            /* SUCCESS STATE                              */
                            /* ========================================= */
                            <div className="text-center">
                                <span
                                    className="
                    mx-auto
                    mb-5
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-amber/20
                    bg-amber/10
                    text-amber
                  "
                                >
                                    <CheckCircle2 className="h-7 w-7" strokeWidth={1.6} />
                                </span>

                                <h1
                                    className="
                    font-display
                    text-[1.6rem]
                    font-semibold
                    leading-[1.1]
                    tracking-[-0.035em]
                    text-graphite
                    sm:text-[1.75rem]
                    dark:text-mist
                  "
                                >
                                    Check your inbox
                                </h1>

                                <p className="mt-3 text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
                                    If an account exists for{" "}
                                    <span className="font-medium text-graphite dark:text-mist">
                                        {email.trim()}
                                    </span>
                                    , we&apos;ve sent a link to reset your password. It expires in
                                    30 minutes.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSent(false);
                                        setEmail("");
                                    }}
                                    className="
                    mt-6
                    text-[13px]
                    font-medium
                    text-amber
                    transition-colors
                    duration-200
                    hover:text-amber-strong
                  "
                                >
                                    Use a different email
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* ======================================= */}
                                {/* HEADER                                   */}
                                {/* ======================================= */}
                                <div>
                                    <div
                                        className="
                      mb-3
                      flex
                      items-center
                      gap-2
                      font-mono
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.18em]
                      text-amber
                      sm:mb-4
                      sm:text-[10px]
                    "
                                    >
                                        <span className="h-px w-5 bg-amber sm:w-6" />
                                        Account recovery
                                    </div>

                                    <h1
                                        className="
                      font-display
                      text-[1.75rem]
                      font-semibold
                      leading-[1.05]
                      tracking-[-0.035em]
                      text-graphite
                      sm:text-3xl
                      dark:text-mist
                    "
                                    >
                                        Reset your password
                                    </h1>

                                    <p className="mt-2.5 text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
                                        Enter your email and we&apos;ll send you a link to set a new
                                        one.
                                    </p>
                                </div>

                                {/* ======================================= */}
                                {/* FORM                                     */}
                                {/* ======================================= */}
                                <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4 sm:mt-7">
                                    <label className="block">
                                        <span className="mb-1.5 block text-[11px] font-medium text-graphite dark:text-mist">
                                            Email address
                                        </span>

                                        <span
                                            className={`
                        relative
                        flex
                        h-11
                        w-full
                        items-center
                        rounded-xl
                        border
                        bg-paper-surface/50
                        px-3.5
                        transition-colors
                        focus-within:border-amber
                        dark:bg-ink-surface/50
                        ${error
                                                    ? "border-coral/60"
                                                    : "border-paper-border dark:border-ink-border"
                                                }
                      `}
                                        >
                                            <Mail
                                                className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                                                strokeWidth={1.7}
                                            />

                                            <input
                                                type="email"
                                                value={email}
                                                autoComplete="email"
                                                autoFocus
                                                aria-invalid={error ? true : undefined}
                                                aria-describedby={error ? "email-error" : undefined}
                                                onChange={(event) => {
                                                    setEmail(event.target.value);
                                                    if (error) setError(null);
                                                }}
                                                placeholder="you@example.com"
                                                className="
                          min-w-0
                          flex-1
                          bg-transparent
                          text-sm
                          text-graphite
                          outline-none
                          placeholder:text-graphite-faint
                          dark:text-mist
                          dark:placeholder:text-mist-faint
                        "
                                            />
                                        </span>
                                    </label>

                                    {error && (
                                        <p
                                            id="email-error"
                                            role="alert"
                                            className="flex items-start gap-2 text-[12px] leading-5 text-coral"
                                        >
                                            <AlertCircle
                                                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                                strokeWidth={1.9}
                                            />
                                            {error}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="
                      group
                      mt-1
                      inline-flex
                      h-12
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      border
                      border-amber/40
                      bg-amber
                      text-sm
                      font-semibold
                      text-ink
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:gap-3
                      hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]
                      active:translate-y-0
                      active:scale-[0.98]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      disabled:hover:translate-y-0
                      disabled:hover:gap-2
                    "
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                                Sending link…
                                            </>
                                        ) : (
                                            <>
                                                Send reset link
                                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* ========================================== */}
                        {/* FOOTER                                      */}
                        {/* ========================================== */}
                        <div className="mt-6 border-t border-paper-border pt-5 dark:border-ink-border">
                            <Link
                                href="/sign-in"
                                className="
                  group
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  text-[13px]
                  font-medium
                  text-graphite-muted
                  transition-colors
                  duration-200
                  hover:text-amber
                  dark:text-mist-muted
                "
                            >
                                <ArrowLeft
                                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                                    strokeWidth={1.9}
                                />
                                Back to sign in
                            </Link>
                        </div>
                    </div>

                    <p className="mt-5 flex items-center justify-center gap-1.5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
                        <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                        Reset links expire after 30 minutes
                    </p>
                </div>
            </div>
        </main>
    );
}
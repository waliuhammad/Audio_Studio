"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/navbar/Logo";
import {
  AlertCircle,
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  Github,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  validateEmail,
  validateRequiredPassword,
} from "@/lib/auth/validation";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field: keyof FieldErrors) => {
    setErrors((previous) => {
      if (!previous[field]) return previous;

      const next = { ...previous };
      delete next[field];
      return next;
    });

    setFormNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;

    const passwordError = validateRequiredPassword(password);
    if (passwordError) nextErrors.password = passwordError;

    setErrors(nextErrors);
    setFormNotice(null);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setIsSubmitting(false);
        setFormNotice(data.error ?? "Could not sign you in. Please try again.");
        return;
      }

      // Read the param here rather than via useSearchParams() — that hook opts
      // the whole page out of static prerendering unless it sits behind a
      // Suspense boundary, and this only ever runs from a click handler.
      const requested = new URLSearchParams(window.location.search).get("next");

      // Only send users to internal paths — an open redirect would let an
      // attacker bounce people to a phishing page via ?next=https://evil.com
      const destination =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : "/dashboard";

      // refresh() re-runs server components so the new session is picked up.
      router.replace(destination);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      setFormNotice("Network error. Check your connection and try again.");
    }
  };

  const handleSocial = (provider: string) => {
    setErrors({});
    setFormNotice(
      `${provider} sign-in isn't connected yet — use your email and password.`
    );
  };

  const fieldWrapperClass = (hasError: boolean) => `
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
    ${hasError ? "border-coral/60" : "border-paper-border dark:border-ink-border"}
  `;

  const inputClass = `
    min-w-0
    flex-1
    bg-transparent
    text-sm
    text-graphite
    outline-none
    placeholder:text-graphite-faint
    dark:text-mist
    dark:placeholder:text-mist-faint
  `;

  const socialButtonClass = `
    flex
    h-11
    items-center
    justify-center
    gap-2
    rounded-xl
    border
    border-paper-border
    bg-paper
    text-xs
    font-medium
    text-graphite
    transition-all
    duration-200
    hover:border-amber/40
    hover:text-amber
    disabled:cursor-not-allowed
    disabled:opacity-50
    dark:border-ink-border
    dark:bg-ink
    dark:text-mist
    dark:hover:border-amber/40
    dark:hover:text-amber
  `;

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

      {/* ================================================= */}
      {/* AUTH CARD                                         */}
      {/* ================================================= */}

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

            {/* =========================================== */}
            {/* HEADER                                       */}
            {/* =========================================== */}

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
                Welcome back
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
                Sign in to your studio
              </h1>

              <p
                className="
                  mt-2.5
                  text-[13px]
                  leading-6
                  text-graphite-muted
                  sm:text-sm
                  dark:text-mist-muted
                "
              >
                Pick up where you left off and keep shaping your sound.
              </p>
            </div>

            {/* =========================================== */}
            {/* FORM                                         */}
            {/* =========================================== */}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-6 flex flex-col gap-4 sm:mt-7"
            >
              {/* Email */}
              <label className="block">
                <span
                  className="
                    mb-1.5
                    block
                    text-[11px]
                    font-medium
                    text-graphite
                    dark:text-mist
                  "
                >
                  Email address
                </span>

                <span className={fieldWrapperClass(Boolean(errors.email))}>
                  <Mail
                    className="
                      mr-2.5
                      h-4
                      w-4
                      shrink-0
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                    strokeWidth={1.7}
                  />

                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "signin-email-error" : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError("email");
                    }}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </span>

                {errors.email && (
                  <span
                    id="signin-email-error"
                    role="alert"
                    className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-coral"
                  >
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.email}
                  </span>
                )}
              </label>

              {/* Password */}
              <label className="block">
                <span
                  className="
                    mb-1.5
                    block
                    text-[11px]
                    font-medium
                    text-graphite
                    dark:text-mist
                  "
                >
                  Password
                </span>

                <span className={fieldWrapperClass(Boolean(errors.password))}>
                  <Lock
                    className="
                      mr-2.5
                      h-4
                      w-4
                      shrink-0
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                    strokeWidth={1.7}
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={
                      errors.password ? "signin-password-error" : undefined
                    }
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError("password");
                    }}
                    placeholder="••••••••"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="
                      ml-2
                      shrink-0
                      rounded-md
                      p-1
                      text-graphite-faint
                      transition-colors
                      hover:text-amber
                      dark:text-mist-faint
                      dark:hover:text-amber
                    "
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.7} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.7} />
                    )}
                  </button>
                </span>

                {errors.password && (
                  <span
                    id="signin-password-error"
                    role="alert"
                    className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-coral"
                  >
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.password}
                  </span>
                )}
              </label>

              {/* Remember + forgot */}
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-w-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="
                      h-4
                      w-4
                      shrink-0
                      cursor-pointer
                      rounded
                      border
                      border-paper-border
                      bg-paper-surface
                      accent-amber
                      dark:border-ink-border
                      dark:bg-ink-surface
                    "
                  />

                  <span className="text-[11px] text-graphite-muted dark:text-mist-muted">
                    Remember me
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="
                    shrink-0
                    text-[11px]
                    font-medium
                    text-graphite
                    transition-colors
                    hover:text-amber
                    dark:text-mist
                    dark:hover:text-amber
                  "
                >
                  Forgot password?
                </Link>
              </div>

              {/* Form-level notice */}
              {formNotice && (
                <p
                  role="status"
                  className="
                    flex
                    items-start
                    gap-2
                    rounded-xl
                    border
                    border-amber/30
                    bg-amber/[0.06]
                    px-3.5
                    py-2.5
                    text-[12px]
                    leading-5
                    text-graphite
                    dark:text-mist
                  "
                >
                  <AlertCircle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber"
                    strokeWidth={1.9}
                  />
                  {formNotice}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  group
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-amber
                  text-sm
                  font-semibold
                  text-ink
                  shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)]
                  active:translate-y-0
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  disabled:hover:translate-y-0
                  disabled:hover:shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                "
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight
                      className="
                        h-4
                        w-4
                        transition-transform
                        duration-300
                        group-hover:translate-x-0.5
                      "
                      strokeWidth={2}
                    />
                  </>
                )}
              </button>
            </form>

            {/* =========================================== */}
            {/* DIVIDER + SOCIAL                            */}
            {/* =========================================== */}

            <div className="mt-6 flex items-center gap-3 sm:mt-7">
              <span
                aria-hidden="true"
                className="h-px flex-1 bg-paper-border dark:bg-ink-border"
              />

              <span
                className="
                  shrink-0
                  font-mono
                  text-[8px]
                  uppercase
                  tracking-[0.16em]
                  text-graphite-faint
                  dark:text-mist-faint
                "
              >
                or continue with
              </span>

              <span
                aria-hidden="true"
                className="h-px flex-1 bg-paper-border dark:bg-ink-border"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocial("Google")}
                disabled={isSubmitting}
                className={socialButtonClass}
              >
                <Chrome className="h-4 w-4" strokeWidth={1.7} />
                Google
              </button>

              <button
                type="button"
                onClick={() => handleSocial("GitHub")}
                disabled={isSubmitting}
                className={socialButtonClass}
              >
                <Github className="h-4 w-4" strokeWidth={1.7} />
                GitHub
              </button>
            </div>

            {/* =========================================== */}
            {/* FOOTER NOTE                                  */}
            {/* =========================================== */}

            <div className="mt-6 text-center sm:mt-7">
              <p className="text-[11px] text-graphite-muted dark:text-mist-muted">
                New to Audio Studio?{" "}
                <Link
                  href="/sign-up"
                  className="
                    font-medium
                    text-graphite
                    transition-colors
                    hover:text-amber
                    dark:text-mist
                    dark:hover:text-amber
                  "
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* ============================================= */}
          {/* SECURITY NOTE                                 */}
          {/* ============================================= */}

          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              gap-2
              font-mono
              text-[8px]
              uppercase
              tracking-[0.16em]
              text-graphite-faint
              dark:text-mist-faint
            "
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber" strokeWidth={1.6} />
            Secure connection · Files stay on your device
          </div>
        </div>
      </div>
    </main>
  );
}
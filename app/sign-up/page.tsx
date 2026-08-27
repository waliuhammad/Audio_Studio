"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { nextPathFromLocation } from "@/lib/auth/next-path";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  getPasswordChecks,
  getPasswordStrength,
  STRENGTH_META,
  validateConfirmation,
  validateEmail,
  validateName,
  validateNewPassword,
} from "@/lib/auth/validation";
import {
  describeAuthError,
  signInWithGithub,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth-client";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmation?: string;
  terms?: string;
}

/* Brand-accurate icons for the social row below. Google needs its real
 * four-color mark and Facebook its blue glyph — lucide's "Chrome" icon
 * isn't Google's logo at all, and a plain currentColor Facebook glyph
 * loses the brand blue. GitHub, X, and Apple are genuinely monochrome
 * brand marks, so the existing lucide icons already match. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.94 13.94 0 0 1 10.98 24c0-1.45.25-2.86.71-4.18v-5.7H4.34A21.93 21.93 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#1877F2"
        d="M48 24a24 24 0 1 0-27.75 23.71V30.94h-6.1V24h6.1v-5.29c0-6.02 3.59-9.35 9.08-9.35 2.63 0 5.38.47 5.38.47v5.92h-3.03c-2.99 0-3.92 1.86-3.92 3.76V24h6.67l-1.07 6.94h-5.6v16.77A24 24 0 0 0 48 24z"
      />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.6.24 2.78.12 3.07.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.16 0 1.56-.02 2.82-.02 3.2 0 .31.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 4h-2l12.3 16z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.36 1.4c.1 1.1-.32 2.16-.94 2.94-.66.82-1.76 1.46-2.84 1.38-.13-1.06.38-2.16 1-2.9.68-.82 1.86-1.42 2.78-1.42zM20.1 17.24c-.53 1.2-.78 1.73-1.46 2.79-.95 1.47-2.29 3.3-3.95 3.32-1.47.02-1.85-.96-3.85-.95-2 .01-2.42.97-3.89.95-1.66-.02-2.93-1.67-3.88-3.14-2.65-4.08-2.93-8.86-1.29-11.4 1.16-1.8 3-2.86 4.72-2.86 1.76 0 2.86 1 4.32 1 1.4 0 2.27-1 4.3-1 1.53 0 3.14.83 4.3 2.28-3.78 2.07-3.17 7.46.68 9.01z" />
    </svg>
  );
}

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthMeta = STRENGTH_META[strength];

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

    const nameError = validateName(name);
    if (nameError) nextErrors.name = nameError;

    const emailError = validateEmail(email);
    if (emailError) nextErrors.email = emailError;

    const passwordError = validateNewPassword(password);
    if (passwordError) nextErrors.password = passwordError;

    const confirmationError = validateConfirmation(password, confirmation);
    if (confirmationError) nextErrors.confirmation = confirmationError;

    if (!acceptedTerms) {
      nextErrors.terms = "Please accept the terms to continue.";
    }

    setErrors(nextErrors);
    setFormNotice(null);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await signUpWithEmail(name.trim(), email.trim(), password);

      /*
       * Registering hands you to the sign-in form, not to the app.
       *
       * `registered=1` is what tells that page to say the account was created,
       * so arriving at a login screen reads as the next step rather than as
       * the sign-up having failed. The original ?next= is carried through, so
       * someone who set out for the editor still lands there once they log in.
       */
      const destination = nextPathFromLocation();

      const params = new URLSearchParams({ registered: "1" });

      if (destination !== "/dashboard") params.set("next", destination);

      router.replace(`/sign-in?${params.toString()}`);
    } catch (error) {
      setIsSubmitting(false);

      const message = describeAuthError(error);

      // Put provider errors on the field they belong to.
      if (message.includes("already exists")) {
        setErrors({ email: message });
      } else if (message.includes("password")) {
        setErrors({ password: message });
      } else {
        setFormNotice(message);
      }
    }
  };

  const handleSocial = async (
    provider: "Google" | "GitHub" | "Facebook" | "X" | "Apple"
  ) => {
    setErrors({});
    setFormNotice(null);

    // Facebook, X, and Apple aren't wired up to Firebase yet — say so
    // plainly instead of leaving the button looking broken.
    if (provider !== "Google" && provider !== "GitHub") {
      setFormNotice(`Sign-in with ${provider} isn't available yet.`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (provider === "Google") {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }

      router.replace(nextPathFromLocation());
      router.refresh();
    } catch (error) {
      setIsSubmitting(false);
      setFormNotice(describeAuthError(error));
    }
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

  const labelTextClass = `
    mb-1.5
    block
    text-[11px]
    font-medium
    text-graphite
    dark:text-mist
  `;

  const revealButtonClass = `
    ml-2
    shrink-0
    rounded-md
    p-1
    text-graphite-faint
    transition-colors
    hover:text-amber
    dark:text-mist-faint
    dark:hover:text-amber
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

  const socialIconButtonClass = `
    flex
    h-11
    w-11
    shrink-0
    items-center
    justify-center
    rounded-full
    border
    border-paper-border
    bg-paper
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

  const errorTextClass =
    "mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-coral";

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
                Create account
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
                Join Audio Studio
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
                Create your account and start shaping your sound in seconds.
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
              {/* Name */}
              <label className="block">
                <span className={labelTextClass}>Full name</span>

                <span className={fieldWrapperClass(Boolean(errors.name))}>
                  <UserRound
                    className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                    strokeWidth={1.7}
                  />

                  <input
                    type="text"
                    value={name}
                    autoComplete="name"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "signup-name-error" : undefined}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearError("name");
                    }}
                    placeholder="Ada Lovelace"
                    className={inputClass}
                  />
                </span>

                {errors.name && (
                  <span id="signup-name-error" role="alert" className={errorTextClass}>
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.name}
                  </span>
                )}
              </label>

              {/* Email */}
              <label className="block">
                <span className={labelTextClass}>Email address</span>

                <span className={fieldWrapperClass(Boolean(errors.email))}>
                  <Mail
                    className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                    strokeWidth={1.7}
                  />

                  <input
                    type="email"
                    value={email}
                    autoComplete="email"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "signup-email-error" : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError("email");
                    }}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </span>

                {errors.email && (
                  <span id="signup-email-error" role="alert" className={errorTextClass}>
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.email}
                  </span>
                )}
              </label>

              {/* Password */}
              <label className="block">
                <span className={labelTextClass}>Password</span>

                <span className={fieldWrapperClass(Boolean(errors.password))}>
                  <Lock
                    className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                    strokeWidth={1.7}
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={
                      errors.password ? "signup-password-error" : undefined
                    }
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError("password");
                      clearError("confirmation");
                    }}
                    placeholder="Create a strong password"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={revealButtonClass}
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
                    id="signup-password-error"
                    role="alert"
                    className={errorTextClass}
                  >
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.password}
                  </span>
                )}

                {/* Strength meter */}
                {password.length > 0 && (
                  <span className="mt-2.5 block">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1 flex-1 overflow-hidden rounded-full bg-paper-border dark:bg-ink-border"
                      >
                        <span
                          className={`block h-full rounded-full transition-all duration-300 ${strengthMeta.barClass}`}
                          style={{ width: strengthMeta.width }}
                        />
                      </span>

                      <span
                        className={`font-mono text-[8px] font-semibold uppercase tracking-[0.14em] ${strengthMeta.textClass}`}
                      >
                        {strengthMeta.label}
                      </span>
                    </span>
                  </span>
                )}

                {/* Password rules */}
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {passwordChecks.map((check) => (
                    <span
                      key={check.label}
                      className={`
                        flex
                        items-center
                        gap-1
                        font-mono
                        text-[8px]
                        uppercase
                        tracking-[0.08em]
                        transition-colors
                        duration-200
                        ${check.passed
                          ? "text-teal"
                          : "text-graphite-faint dark:text-mist-faint"
                        }
                      `}
                    >
                      {check.passed ? (
                        <Check className="h-3 w-3" strokeWidth={2.4} />
                      ) : (
                        <X className="h-3 w-3 opacity-50" strokeWidth={2.4} />
                      )}
                      {check.label}
                    </span>
                  ))}
                </span>
              </label>

              {/* Confirm password */}
              <label className="block">
                <span className={labelTextClass}>Confirm password</span>

                <span className={fieldWrapperClass(Boolean(errors.confirmation))}>
                  <LockKeyhole
                    className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                    strokeWidth={1.7}
                  />

                  <input
                    type={showConfirmation ? "text" : "password"}
                    value={confirmation}
                    autoComplete="new-password"
                    aria-invalid={errors.confirmation ? true : undefined}
                    aria-describedby={
                      errors.confirmation ? "signup-confirmation-error" : undefined
                    }
                    onChange={(event) => {
                      setConfirmation(event.target.value);
                      clearError("confirmation");
                    }}
                    placeholder="Repeat your password"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmation((previous) => !previous)}
                    aria-label={
                      showConfirmation ? "Hide password" : "Show password"
                    }
                    className={revealButtonClass}
                  >
                    {showConfirmation ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.7} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.7} />
                    )}
                  </button>
                </span>

                {errors.confirmation && (
                  <span
                    id="signup-confirmation-error"
                    role="alert"
                    className={errorTextClass}
                  >
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.confirmation}
                  </span>
                )}
              </label>

              {/* Terms */}
              <div>
                <label className="flex min-w-0 cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    aria-invalid={errors.terms ? true : undefined}
                    onChange={(event) => {
                      setAcceptedTerms(event.target.checked);
                      clearError("terms");
                    }}
                    className="
                      mt-0.5
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

                  <span className="min-w-0 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="
                        font-medium
                        text-graphite
                        transition-colors
                        hover:text-amber
                        dark:text-mist
                        dark:hover:text-amber
                      "
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="
                        font-medium
                        text-graphite
                        transition-colors
                        hover:text-amber
                        dark:text-mist
                        dark:hover:text-amber
                      "
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                {errors.terms && (
                  <p role="alert" className={errorTextClass}>
                    <AlertCircle className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {errors.terms}
                  </p>
                )}
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
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
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
                OR
              </span>

              <span
                aria-hidden="true"
                className="h-px flex-1 bg-paper-border dark:bg-ink-border"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleSocial("Google")}
                disabled={isSubmitting}
                aria-label="Continue with Google"
                className={socialIconButtonClass}
              >
                <GoogleIcon className="h-[18px] w-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => void handleSocial("Facebook")}
                disabled={isSubmitting}
                aria-label="Continue with Facebook"
                className={socialIconButtonClass}
              >
                <FacebookIcon className="h-[18px] w-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => void handleSocial("GitHub")}
                disabled={isSubmitting}
                aria-label="Continue with GitHub"
                className={socialIconButtonClass}
              >
                <GithubIcon className="h-[18px] w-[18px]" />
              </button>

              <button
                type="button"
                onClick={() => void handleSocial("X")}
                disabled={isSubmitting}
                aria-label="Continue with X"
                className={socialIconButtonClass}
              >
                <XIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleSocial("Apple")}
                disabled={isSubmitting}
                aria-label="Continue with Apple"
                className={socialIconButtonClass}
              >
                <AppleIcon className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* =========================================== */}
            {/* FOOTER NOTE                                  */}
            {/* =========================================== */}

            <div className="mt-6 text-center sm:mt-7">
              <p className="text-[11px] text-graphite-muted dark:text-mist-muted">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="
                    font-medium
                    text-graphite
                    transition-colors
                    hover:text-amber
                    dark:text-mist
                    dark:hover:text-amber
                  "
                >
                  Log in
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
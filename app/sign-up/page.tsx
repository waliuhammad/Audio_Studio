import Link from "next/link";
import { Logo } from "@/components/navbar/Logo";
import {
  ArrowRight,
  Check,
  Chrome,
  Eye,
  Github,
  Lock,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const PASSWORD_RULES = ["8+ characters", "1 uppercase", "1 number"];

export default function SignUpPage() {
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

          {/* ============================================= */}
          {/* CARD                                           */}
          {/* ============================================= */}

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
              action="/"
              className="mt-6 flex flex-col gap-4 sm:mt-7"
            >
              {/* Full name */}
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
                  Full name
                </span>

                <span
                  className="
                    relative
                    flex
                    h-11
                    w-full
                    items-center
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface/50
                    px-3.5
                    transition-colors
                    focus-within:border-amber
                    dark:border-ink-border
                    dark:bg-ink-surface/50
                  "
                >
                  <UserRound
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
                    type="text"
                    placeholder="Ada Lovelace"
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

                <span
                  className="
                    relative
                    flex
                    h-11
                    w-full
                    items-center
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface/50
                    px-3.5
                    transition-colors
                    focus-within:border-amber
                    dark:border-ink-border
                    dark:bg-ink-surface/50
                  "
                >
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

                <span
                  className="
                    relative
                    flex
                    h-11
                    w-full
                    items-center
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface/50
                    px-3.5
                    transition-colors
                    focus-within:border-amber
                    dark:border-ink-border
                    dark:bg-ink-surface/50
                  "
                >
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
                    type="password"
                    placeholder="Create a strong password"
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

                  {/* <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Show password"
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      text-graphite-faint
                      transition-colors
                      hover:text-amber
                      dark:text-mist-faint
                      dark:hover:text-amber
                    "
                  >
                    <Eye
                      className="h-4 w-4"
                      strokeWidth={1.7}
                    />
                  </button> */}
                </span>

                {/* Password rules */}
                <span
                  className="
                    mt-2
                    flex
                    flex-wrap
                    items-center
                    gap-x-3
                    gap-y-1
                  "
                >
                  {PASSWORD_RULES.map((rule) => (
                    <span
                      key={rule}
                      className="
                        flex
                        items-center
                        gap-1
                        font-mono
                        text-[8px]
                        uppercase
                        tracking-[0.08em]
                        text-graphite-faint
                        dark:text-mist-faint
                      "
                    >
                      <Check
                        className="h-3 w-3 text-amber"
                        strokeWidth={2}
                      />
                      {rule}
                    </span>
                  ))}
                </span>
              </label>

              {/* Confirm password */}
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
                  Confirm password
                </span>

                <span
                  className="
                    relative
                    flex
                    h-11
                    w-full
                    items-center
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface/50
                    px-3.5
                    transition-colors
                    focus-within:border-amber
                    dark:border-ink-border
                    dark:bg-ink-surface/50
                  "
                >
                  <LockKeyhole
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
                    type="password"
                    placeholder="Repeat your password"
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

              {/* Terms */}
              <label
                className="
                  flex
                  min-w-0
                  cursor-pointer
                  items-start
                  gap-2
                "
              >
                <input
                  type="checkbox"
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

                <span
                  className="
                    min-w-0
                    text-[11px]
                    leading-5
                    text-graphite-muted
                    dark:text-mist-muted
                  "
                >
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
                  .
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
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
                "
              >
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
                or sign up with
              </span>

              <span
                aria-hidden="true"
                className="h-px flex-1 bg-paper-border dark:bg-ink-border"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Google */}
              <button
                type="button"
                className="
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
                  dark:border-ink-border
                  dark:bg-ink
                  dark:text-mist
                  dark:hover:border-amber/40
                  dark:hover:text-amber
                "
              >
                <Chrome
                  className="h-4 w-4"
                  strokeWidth={1.7}
                />
                Google
              </button>

              {/* GitHub */}
              <button
                type="button"
                className="
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
                  dark:border-ink-border
                  dark:bg-ink
                  dark:text-mist
                  dark:hover:border-amber/40
                  dark:hover:text-amber
                "
              >
                <Github
                  className="h-4 w-4"
                  strokeWidth={1.7}
                />
                GitHub
              </button>
            </div>

            {/* =========================================== */}
            {/* FOOTER NOTE                                  */}
            {/* =========================================== */}

            <div className="mt-6 text-center sm:mt-7">
              <p
                className="
                  text-[11px]
                  text-graphite-muted
                  dark:text-mist-muted
                "
              >
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
                  Sign in
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
            <ShieldCheck
              className="h-3.5 w-3.5 text-amber"
              strokeWidth={1.6}
            />

            Secure signup · No credit card required
          </div>
        </div>
      </div>
    </main>
  );
}
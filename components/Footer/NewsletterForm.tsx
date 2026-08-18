"use client";

import { Mail } from "lucide-react";

/**
 * The only interactive part of the footer.
 *
 * Kept as its own client island so the ~670-line Footer itself can stay a
 * server component and ship no JS for its (entirely static) link lists.
 */
export function NewsletterForm() {
  return (
    <form
      onSubmit={(event) =>
        event.preventDefault()
      }
      className="
        flex
        flex-col
        gap-3
        sm:flex-row
        lg:flex-col
      "
    >
      {/* Email input */}
      <div
        className="
          flex
          h-11
          min-w-0
          flex-1
          items-center
          rounded-xl
          border
          border-paper-border
          bg-paper-surface
          px-3.5
          transition-colors
          focus-within:border-amber
          dark:border-ink-border
          dark:bg-ink-surface
          sm:min-w-[220px]
          lg:min-w-0
        "
      >
        <Mail
          className="
            mr-2.5
            h-4
            w-4
            shrink-0
            text-graphite-muted
            dark:text-mist-muted
          "
          strokeWidth={1.7}
        />

        <input
          type="email"
          placeholder="Enter your email"
          aria-label="Email address"
          className="
            min-w-0
            h-8
            flex-1
            bg-transparent
            text-sm
            text-graphite
            outline-none
            placeholder:text-graphite-muted
            dark:text-mist
            dark:placeholder:text-mist-muted
          "
        />
      </div>

      {/* Subscribe */}
      <button
        type="submit"
        className="
          h-10
          shrink-0
          rounded-lg
          bg-amber
          px-5
          text-xs
          font-semibold
          text-ink
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:shadow-[0_6px_18px_rgba(245,158,11,0.22)]
          active:translate-y-0
          sm:h-11
          lg:h-10
        "
      >
        Subscribe
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

/**
 * The only interactive part of the footer.
 *
 * Kept as its own client island so the ~670-line Footer itself can stay a
 * server component and ship no JS for its (entirely static) link lists.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  /**
   * The form used to preventDefault() and stop there, so every address typed
   * into it was discarded. It now posts to /api/newsletter, which records the
   * address in Firestore for whichever mailing service gets wired up later.
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (state === "sending") return;

    setState("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not sign you up.");
      }

      setState("done");
      setMessage("You're on the list.");
      setEmail("");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Could not sign you up."
      );
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
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
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state !== "idle") setState("idle");
            setMessage(null);
          }}
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
        disabled={state === "sending"}
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
          disabled:cursor-not-allowed
          disabled:opacity-60
          disabled:hover:translate-y-0
          sm:h-11
          lg:h-10
        "
      >
        {state === "sending" ? (
          <Loader2 className="mx-auto h-4 w-4 animate-spin" strokeWidth={2} />
        ) : state === "done" ? (
          <Check className="mx-auto h-4 w-4" strokeWidth={2.4} />
        ) : (
          "Subscribe"
        )}
      </button>

      {message && (
        <p
          className={`text-[11px] ${state === "error" ? "text-coral" : "text-teal"
            }`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}

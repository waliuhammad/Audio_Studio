"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

const SUPPORT_EMAIL = "support@audiostudio.com";

/**
 * Routes that already exist and already answer things, rather than invented
 * channels. There is no phone line and no live chat staffed behind this page,
 * so neither is offered — a contact page that lists a way through we cannot
 * actually honour is worse than one that lists fewer.
 */
const CHANNELS = [
  {
    title: "Email us",
    description: "The surest way to reach a person. Written replies, with your history attached.",
    icon: Mail,
    action: `mailto:${SUPPORT_EMAIL}`,
    actionLabel: SUPPORT_EMAIL,
    external: true,
  },
  {
    title: "Support centre",
    description: "Guides by topic — getting started, tools, exports, account and billing.",
    icon: BookOpen,
    action: "/support",
    actionLabel: "Browse support",
    external: false,
  },
  {
    title: "Common questions",
    description: "The things people ask most, answered on the home page.",
    icon: HelpCircle,
    action: "/#faq",
    actionLabel: "Read the FAQ",
    external: false,
  },
];

const SUBJECTS = [
  "General question",
  "A tool is not working",
  "Account or billing",
  "Feature request",
  "Report a problem",
] as const;

/* ===================================================== */
/* PAGE                                                  */
/* ===================================================== */

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [message, setMessage] = useState("");

  /*
   * There is no server route behind this form, and rather than post into
   * nothing and show a cheerful "we got it", it composes the mail and hands
   * it to whatever the visitor already uses. The message genuinely gets sent,
   * it lands in their sent folder, and replies thread normally.
   */
  const mailtoHref = (() => {
    const lines = [
      message.trim(),
      "",
      "—",
      name.trim() ? `From: ${name.trim()}` : "",
      email.trim() ? `Reply to: ${email.trim()}` : "",
    ].filter(Boolean);

    const params = new URLSearchParams({
      subject: subject,
      body: lines.join("\n"),
    });

    return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
  })();

  const canSend = message.trim().length > 0;

  const fieldClass = `
    h-11
    w-full
    rounded-xl
    border
    border-paper-border
    bg-paper-surface/50
    px-3.5
    text-sm
    text-graphite
    outline-none
    transition-all
    duration-200
    placeholder:text-graphite-faint
    focus:border-amber
    focus:bg-paper-surface
    dark:border-ink-border
    dark:bg-ink-surface/50
    dark:text-mist
    dark:placeholder:text-mist-faint
    dark:focus:bg-ink-surface
  `;

  const labelClass =
    "mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint";

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      {/* ================================================= */}
      {/* AMBIENT GLOW                                      */}
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

      {/* ================================================= */}
      {/* TOP BAR                                           */}
      {/* ================================================= */}

      <header className="border-b border-paper-border bg-paper/85 backdrop-blur-xl dark:border-ink-border dark:bg-ink/85">
        <div className="container-studio flex h-16 items-center gap-2">
          <Link
            href="/"
            className="group flex items-center gap-2 text-[13px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={1.8}
            />
            <span className="hidden sm:inline">Back to home</span>
          </Link>

          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-graphite-faint dark:text-mist-faint">
            Audio Studio
          </span>
        </div>
      </header>

      {/* ================================================= */}
      {/* BODY                                              */}
      {/* ================================================= */}

      <div className="container-studio relative flex flex-1 justify-center py-12 sm:py-16">
        <div className="w-full max-w-3xl">
          {/* ============================================= */}
          {/* HEADER                                        */}
          {/* ============================================= */}

          <div
            className="
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-5
              py-7
              sm:px-8
              sm:py-9
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
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
                sm:text-[10px]
              "
            >
              <span className="h-px w-5 bg-amber sm:w-6" />
              Contact
            </div>

            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
              Get in touch.
            </h1>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
              Questions, problems, or something you wish the toolkit did — we
              read every message that comes in.
            </p>

            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.7} />
              Replies within 24 hours on business days
            </span>
          </div>

          {/* ============================================= */}
          {/* CHANNELS                                      */}
          {/* ============================================= */}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;

              const inner = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber transition-colors group-hover:bg-amber group-hover:text-ink">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </span>

                  <p className="mt-3.5 text-[13px] font-semibold text-graphite dark:text-mist">
                    {channel.title}
                  </p>

                  <p className="mt-1 flex-1 text-[12px] leading-5 text-graphite-muted dark:text-mist-muted">
                    {channel.description}
                  </p>

                  <span className="mt-3 flex items-center gap-1.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-amber">
                    <span className="truncate">{channel.actionLabel}</span>
                    <ArrowRight
                      className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={2}
                    />
                  </span>
                </>
              );

              const cardClass = `
                group
                flex
                min-w-0
                flex-col
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                p-4
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-amber/50
                dark:border-ink-border
                dark:bg-ink-surface
                dark:hover:border-amber/50
              `;

              return channel.external ? (
                <a key={channel.title} href={channel.action} className={cardClass}>
                  {inner}
                </a>
              ) : (
                <Link key={channel.title} href={channel.action} className={cardClass}>
                  {inner}
                </Link>
              );
            })}
          </div>

          {/* ============================================= */}
          {/* MESSAGE FORM                                  */}
          {/* ============================================= */}

          <div
            className="
              mt-4
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-5
              py-7
              sm:px-8
              sm:py-9
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                <MessageSquare className="h-4 w-4" strokeWidth={1.7} />
              </span>

              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold tracking-tight text-graphite dark:text-mist">
                  Send a message
                </h2>
                <p className="text-[11px] text-graphite-muted dark:text-mist-muted">
                  Opens in your email app, already written.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="contact-name">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Jane Doe"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="contact-email">
                    Your email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="contact-subject">
                  Subject
                </label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className={`${fieldClass} cursor-pointer appearance-none`}
                >
                  {SUBJECTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={6}
                  placeholder="Tell us what happened, and what you expected instead."
                  className="
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-paper-border
                    bg-paper-surface/50
                    p-3.5
                    text-sm
                    leading-6
                    text-graphite
                    outline-none
                    transition-all
                    duration-200
                    placeholder:text-graphite-faint
                    focus:border-amber
                    focus:bg-paper-surface
                    dark:border-ink-border
                    dark:bg-ink-surface/50
                    dark:text-mist
                    dark:placeholder:text-mist-faint
                    dark:focus:bg-ink-surface
                  "
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                  Prefer to write it yourself? Mail{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-medium text-graphite transition-colors hover:text-amber dark:text-mist dark:hover:text-amber"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>

                {/*
                  Disabled until there is something to send: handing the mail
                  app an empty body is a dead end the visitor has to back out of.
                */}
                <a
                  href={canSend ? mailtoHref : undefined}
                  aria-disabled={!canSend}
                  className={`
                    flex
                    h-11
                    shrink-0
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    px-6
                    text-xs
                    font-semibold
                    transition-all
                    duration-300
                    ${
                      canSend
                        ? "bg-amber text-ink shadow-[0_6px_20px_rgba(245,158,11,0.18)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)] active:translate-y-0"
                        : "pointer-events-none cursor-not-allowed border border-paper-border bg-paper-surface text-graphite-faint dark:border-ink-border dark:bg-ink-surface dark:text-mist-faint"
                    }
                  `}
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                  Open in email app
                </a>
              </div>
            </div>
          </div>

          {/* Footer meta */}
          <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-graphite-faint dark:text-mist-faint">
            © {new Date().getFullYear()} Audio Studio. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}

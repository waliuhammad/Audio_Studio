import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import {
  AudioLines,
  Mail,
  Phone,
  ArrowUpRight,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";

const INFORMATION_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Tools", href: "/#tools" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
];

const HELPFUL_LINKS = [
  { label: "FAQ", href: "/#faq" },
  { label: "Support", href: "/support" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "#",
    icon: Instagram,
  },
  {
    label: "Twitter",
    href: "#",
    icon: Twitter,
  },
  {
    label: "YouTube",
    href: "#",
    icon: Youtube,
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: Linkedin,
  },
];

export function Footer() {
  return (
    <footer
      className="
        relative
        mt-10
        overflow-hidden
        border-t
        border-paper-border
        dark:border-ink-border
        sm:mt-12
      "
    >
      {/* ================================================ */}
      {/* AMBER AMBIENT LIGHT                              */}
      {/* ================================================ */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-120px]
          h-52
          w-[420px]
          -translate-x-1/2
          rounded-full
          bg-amber/10
          blur-3xl
          sm:w-[520px]
        "
      />

      <div className="container-studio relative">

        {/* ================================================ */}
        {/* MAIN FOOTER CONTENT                              */}
        {/* ================================================ */}

        <div
          className="
            grid
            gap-10
            py-12
            sm:gap-12
            sm:py-16
            lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr]
            lg:gap-14
            lg:py-20
          "
        >

          {/* ============================================== */}
          {/* BRAND                                           */}
          {/* ============================================== */}

          <div>
            <Link
              href="/"
              className="
                group
                inline-flex
                items-center
                gap-3
              "
            >
              {/* Logo mark */}
              <span
                className="
                  relative
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-[14px]
                  border
                  border-amber/30
                  bg-amber/10
                  text-amber
                  transition-all
                  duration-300
                  group-hover:border-amber
                  group-hover:bg-amber
                  group-hover:text-ink
                  sm:h-12
                  sm:w-12
                "
              >
                <AudioLines
                  className="
                    h-5
                    w-5
                    transition-transform
                    duration-300
                    group-hover:scale-110
                    sm:h-6
                    sm:w-6
                  "
                  strokeWidth={1.6}
                />

                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-1
                    left-1/2
                    h-px
                    w-5
                    -translate-x-1/2
                    bg-current
                    opacity-50
                  "
                />
              </span>

              {/* Brand name */}
              <span
                className="
                  font-display
                  text-lg
                  font-semibold
                  italic
                  tracking-tight
                  text-graphite
                  transition-colors
                  group-hover:text-amber
                  dark:text-mist
                  dark:group-hover:text-amber
                  sm:text-xl
                "
              >
                Audio Studio
              </span>
            </Link>

            <p
              className="
                mt-5
                max-w-[330px]
                text-sm
                leading-7
                text-graphite-muted
                dark:text-mist-muted
                sm:mt-6
              "
            >
              Simple, powerful tools for editing,
              converting and refining your audio
              directly in the browser.
            </p>

            {/* ============================================ */}
            {/* CONTACT                                      */}
            {/* ============================================ */}

            <div className="mt-7 sm:mt-8">
              <p
                className="
                  mb-3
                  font-mono
                  text-[9px]
                  font-medium
                  uppercase
                  tracking-[0.22em]
                  text-amber
                  sm:mb-4
                  sm:text-[10px]
                "
              >
                Contact Us
              </p>

              <div className="space-y-3">

                {/* Phone */}
                <a
                  href="tel:+19999999999"
                  className="
                    group
                    flex
                    min-w-0
                    items-center
                    gap-3
                    text-sm
                    text-graphite-muted
                    transition-colors
                    hover:text-amber
                    dark:text-mist-muted
                    dark:hover:text-amber
                  "
                >
                  <Phone
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.7}
                  />

                  <span>+1 999 999 9999</span>
                </a>

                {/* Email */}
                <a
                href="mailto:support@audiostudio.com"
                  className="
                    group
                    flex
                    min-w-0
                    items-center
                    gap-3
                    text-sm
                    text-graphite-muted
                    transition-colors
                    hover:text-amber
                    dark:text-mist-muted
                    dark:hover:text-amber
                  "
                >
                  <Mail
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.7}
                  />

                  <span className="truncate">
                   support@audiostudio.com
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* ============================================== */}
          {/* INFORMATION + HELPFUL LINKS                    */}
          {/* ============================================== */}

          <div
            className="
              col-span-1
              grid
              grid-cols-2
              gap-8
              lg:contents
            "
          >

            {/* ============================================ */}
            {/* INFORMATION                                 */}
            {/* ============================================ */}

            <div>
              <h3
                className="
                  mb-5
                  text-sm
                  font-semibold
                  text-graphite
                  dark:text-mist
                  sm:mb-6
                "
              >
                Information
              </h3>

              <nav className="flex flex-col items-start gap-3.5 sm:gap-4">
                {INFORMATION_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="
                      group
                      inline-flex
                      items-center
                      gap-1.5
                      text-sm
                      text-graphite-muted
                      transition-colors
                      duration-200
                      hover:text-amber
                      dark:text-mist-muted
                      dark:hover:text-amber
                    "
                  >
                    {link.label}

                    <ArrowUpRight
                      className="
                        hidden
                        h-3.5
                        w-3.5
                        opacity-0
                        transition-all
                        duration-200
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                        group-hover:opacity-100
                        sm:block
                      "
                      strokeWidth={1.8}
                    />
                  </Link>
                ))}
              </nav>
            </div>

            {/* ============================================ */}
            {/* HELPFUL LINKS                                */}
            {/* ============================================ */}

            <div>
              <h3
                className="
                  mb-5
                  text-sm
                  font-semibold
                  text-graphite
                  dark:text-mist
                  sm:mb-6
                "
              >
                Helpful Links
              </h3>

              <nav className="flex flex-col items-start gap-3.5 sm:gap-4">
                {HELPFUL_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="
                      group
                      inline-flex
                      items-center
                      gap-1.5
                      text-sm
                      text-graphite-muted
                      transition-colors
                      duration-200
                      hover:text-amber
                      dark:text-mist-muted
                      dark:hover:text-amber
                    "
                  >
                    {link.label}

                    <ArrowUpRight
                      className="
                        hidden
                        h-3.5
                        w-3.5
                        opacity-0
                        transition-all
                        duration-200
                        group-hover:-translate-y-0.5
                        group-hover:translate-x-0.5
                        group-hover:opacity-100
                        sm:block
                      "
                      strokeWidth={1.8}
                    />
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* ============================================== */}
          {/* STAY UPDATED                                   */}
          {/* ============================================== */}

          <div>
            <h3
              className="
                mb-2
                text-sm
                font-semibold
                text-graphite
                dark:text-mist
              "
            >
              Stay Updated
            </h3>

            <p
              className="
                mb-4
                max-w-[280px]
                text-sm
                leading-6
                text-graphite-muted
                dark:text-mist-muted
                sm:mb-5
              "
            >
              Get occasional updates about new tools
              and improvements.
            </p>

            <NewsletterForm />
          </div>
        </div>

        {/* ================================================ */}
        {/* DIVIDER                                           */}
        {/* ================================================ */}

        <div
          className="
            relative
            h-px
            bg-paper-border
            dark:bg-ink-border
          "
        >
          <span
            aria-hidden="true"
            className="
              absolute
              left-1/2
              top-1/2
              h-1.5
              w-1.5
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-amber
            "
          />
        </div>

        {/* ================================================ */}
        {/* BOTTOM BAR                                       */}
        {/* ================================================ */}

        <div
          className="
            flex
            flex-col
            items-center
            gap-4
            py-6
            text-center
            sm:flex-row
            sm:justify-between
            sm:gap-5
            sm:text-left
          "
        >
          {/* Copyright */}
          <p
            className="
              text-[11px]
              text-graphite-muted
              dark:text-mist-muted
              sm:text-xs
            "
          >
            © {new Date().getFullYear()} Audio Studio.
            All rights reserved.
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-paper-border
                    text-graphite-muted
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-amber
                    hover:bg-amber
                    hover:text-ink
                    dark:border-ink-border
                    dark:text-mist-muted
                    dark:hover:border-amber
                    dark:hover:bg-amber
                    dark:hover:text-ink
                  "
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    strokeWidth={1.7}
                  />
                </a>
              );
            })}
          </div>

          {/* Tagline */}
          <div
            className="
              flex
              items-center
              gap-2
              text-[11px]
              text-graphite-muted
              dark:text-mist-muted
              sm:text-xs
            "
          >
            <span
              className="
                h-1.5
                w-1.5
                shrink-0
                rounded-full
                bg-amber
              "
            />

            Built for better sound.
          </div>
        </div>
      </div>
    </footer>
  );
}
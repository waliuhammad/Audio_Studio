"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "What can I do with Audio Studio?",
    answer: "Trim, split, merge, convert, and clean up audio and video directly in your browser.",
  },
  {
    question: "Do I need to install anything?",
    answer: "No. Audio Studio works directly in your browser with no installation required.",
  },
  {
    question: "Which audio and video formats are supported?",
    answer: "Audio Studio supports common audio and video formats, with more formats added over time.",
  },
  {
    question: "Are my files private?",
    answer: "Yes. We handle your files with privacy and security in mind.",
  },
  {
    question: "Can I use Audio Studio on my phone?",
    answer: "Yes. Audio Studio works on modern mobile and desktop browsers.",
  },
  {
    question: "Do I need an account to use the tools?",
    answer: "Some tools work without an account, while others may require one for extra features.",
  },
];


export function FAQ() {
  const [openIndex, setOpenIndex] =
    React.useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex((current) =>
      current === index ? null : index,
    );
  };

  return (
    <section
      id="faq"
      className="
        container-studio
        scroll-mt-32
        py-14
        sm:scroll-mt-40
        sm:py-20
        lg:scroll-mt-44
      "
    >
      {/* ================================================= */}
      {/* HEADING                                           */}
      {/* ================================================= */}

      <div
        className="
          mb-7
          flex
          items-start
          justify-between
          gap-5
          sm:mb-10
          sm:items-end
        "
      >
        <div>
          <p
            className="
              mb-2.5
              font-mono
              text-[9px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-amber
              sm:mb-3
              sm:text-[10px]
              sm:tracking-[0.24em]
            "
          >
            FAQ
          </p>

          <h2
            className="
              font-display
              text-[1.9rem]
              font-semibold
              leading-[1.05]
              tracking-[-0.035em]
              text-graphite
              dark:text-mist
              sm:text-4xl
            "
          >
            Questions, answered.
          </h2>
        </div>

        <span
          className="
            hidden
            pb-1
            text-xs
            text-graphite-muted
            dark:text-mist-muted
            sm:block
          "
        >
          Everything you need to know.
        </span>
      </div>

      {/* ================================================= */}
      {/* FAQ LIST                                          */}
      {/* ================================================= */}

      <div
        className="
          mx-auto
          max-w-4xl
          border-t
          border-paper-border
          dark:border-ink-border
        "
      >
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.question}
              className="
                border-b
                border-paper-border
                dark:border-ink-border
              "
            >
              {/* Question button */}
              <button
                type="button"
                onClick={() => toggleItem(index)}
                aria-expanded={isOpen}
                className="
                  group
                  flex
                  w-full
                  min-w-0
                  items-center
                  justify-between
                  gap-4
                  py-4
                  text-left
                  sm:gap-6
                  sm:py-5
                "
              >
                {/* Question */}
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                    sm:gap-4
                  "
                >
                  {/* Number */}
                  <span
                    className="
                      hidden
                      w-6
                      shrink-0
                      font-mono
                      text-[10px]
                      text-graphite-muted
                      transition-colors
                      duration-300
                      group-hover:text-amber
                      dark:text-mist-muted
                      sm:block
                    "
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Question text */}
                  <span
                    className={cn(
                      `
                        min-w-0
                        text-[13px]
                        font-medium
                        leading-5
                        transition-colors
                        duration-300
                        sm:text-[15px]
                      `,
                      isOpen
                        ? "text-amber"
                        : "text-graphite group-hover:text-amber dark:text-mist dark:group-hover:text-amber",
                    )}
                  >
                    {item.question}
                  </span>
                </div>

                {/* Plus / minus */}
                <span
                  className={cn(
                    `
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      transition-all
                      duration-300
                      sm:h-8
                      sm:w-8
                    `,
                    isOpen
                      ? "border-amber bg-amber text-ink"
                      : "border-paper-border text-graphite-muted group-hover:border-amber group-hover:text-amber dark:border-ink-border dark:text-mist-muted dark:group-hover:border-amber dark:group-hover:text-amber",
                  )}
                >
                  <Plus
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      isOpen && "rotate-45",
                    )}
                    strokeWidth={1.8}
                  />
                </span>
              </button>

              {/* Answer */}
              <div
                className={cn(
                  `
                    grid
                    transition-[grid-template-rows,opacity]
                    duration-300
                    ease-out
                  `,
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div
                    className="
                      max-w-3xl
                      pb-4
                      pr-10
                      text-[12px]
                      leading-5
                      text-graphite-muted
                      dark:text-mist-muted
                      sm:pb-5
                      sm:pl-10
                      sm:pr-12
                      sm:text-sm
                      sm:leading-relaxed
                    "
                  >
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================= */}
      {/* CONTACT DETAIL                                    */}
      {/* ================================================= */}

      <div
        className="
          mx-auto
          mt-7
          flex
          max-w-4xl
          flex-wrap
          items-center
          gap-x-2
          gap-y-1.5
          text-[11px]
          text-graphite-muted
          dark:text-mist-muted
          sm:mt-8
          sm:gap-3
          sm:text-xs
        "
      >
        <span
          aria-hidden="true"
          className="
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            bg-amber
          "
        />

        <span>Still have a question?</span>

        <a
         href="mailto:support@audiostudio.com"
          className="
            font-medium
            text-graphite
            underline-offset-4
            transition-colors
            hover:text-amber
            hover:underline
            dark:text-mist
          "
        >
          Contact us
        </a>
      </div>
    </section>
  );
}
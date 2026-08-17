"use client";

import { motion } from "framer-motion";
import {
  Check,
  Zap,
  Crown,
  Sparkles,
} from "lucide-react";

const PLANS = [
  {
    name: "Free",
    label: "For getting started",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    description: "Essential tools for simple projects.",
    features: [
      "Basic audio & video tools",
      "Standard export formats",
      "Essential file processing",
      "No account required",
    ],
    button: "Start Free",
    href: "/editor",
  },
  {
    name: "Pro",
    label: "For regular creators",
    price: "$9",
    period: "/ month",
    icon: Zap,
    description: "More power for regular workflows.",
    features: [
      "Everything in Free",
      "All audio & video tools",
      "Higher file limits",
      "Faster processing",
      "Premium exports",
    ],
    button: "Go Pro",
    href: "/sign-up",
    popular: true,
  },
  {
    name: "Studio",
    label: "For heavy workflows",
    price: "$19",
    period: "/ month",
    icon: Crown,
    description: "Built for demanding media work.",
    features: [
      "Everything in Pro",
      "Maximum file limits",
      "Priority processing",
      "Advanced workflows",
      "Priority support",
    ],
    button: "Choose Studio",
    href: "/sign-up",
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="
        container-studio
        scroll-mt-24
        py-14
        sm:scroll-mt-28
        sm:py-18
        lg:scroll-mt-32
        lg:py-24
      "
    >
      {/* ================================================= */}
      {/* HEADING                                           */}
      {/* ================================================= */}

      <div className="max-w-2xl">
        <div
          className="
            mb-3
            flex
            items-center
            gap-2.5
            sm:mb-4
            sm:gap-3
          "
        >
          <span className="h-px w-6 bg-amber sm:w-8" />

          <span
            className="
              font-mono
              text-[9px]
              uppercase
              tracking-[0.2em]
              text-amber
              sm:text-[10px]
              sm:tracking-[0.22em]
            "
          >
            Pricing
          </span>
        </div>

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
            lg:text-5xl
          "
        >
          Simple plans.
          <span className="text-graphite dark:text-mist">
            {" "}
            No unnecessary extras.
          </span>
        </h2>
      </div>

      {/* ================================================= */}
      {/* PRICING CARDS                                     */}
      {/* ================================================= */}

      <div
        className="
          mt-7
          flex
          items-stretch
          gap-3
          overflow-x-auto
          overscroll-x-contain
          pb-4
          snap-x
          snap-mandatory
          sm:mt-9
          sm:gap-4
          lg:grid
          lg:grid-cols-3
          lg:gap-3
          lg:overflow-visible
          lg:pb-0
          lg:snap-none
        "
      >
        {PLANS.map((plan, index) => {
          const Icon = plan.icon;

          return (
            <motion.div
              key={plan.name}
              initial={{
                opacity: 0,
                y: 10,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                amount: 0.2,
              }}
              transition={{
                duration: 0.4,
                delay: index * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="
                flex
                h-full
                min-w-[88%]
                shrink-0
                snap-start
                sm:min-w-[65%]
                lg:min-w-0
                lg:shrink
              "
            >
              <div
                className={`
                  relative
                  flex
                  min-h-[433px]
                  w-full
                  min-w-0
                  flex-1
                  flex-col
                  rounded-xl
                  border
                  p-4
                  transition-all
                  duration-300
                  sm:p-5
                  ${
                    plan.popular
                      ? "border-amber/45 bg-amber/[0.035] dark:bg-amber/[0.025]"
                      : "border-paper-border bg-paper-surface hover:border-amber/30 dark:border-ink-border dark:bg-ink-surface dark:hover:border-amber/30"
                  }
                `}
              >
                {/* ========================================= */}
                {/* POPULAR                                    */}
                {/* ========================================= */}

                {plan.popular && (
                  <div
                    className="
                      absolute
                      right-3
                      top-3
                      flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-amber/20
                      bg-amber/10
                      px-2
                      py-1
                      sm:right-4
                      sm:top-4
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />

                    <span
                      className="
                        font-mono
                        text-[7px]
                        uppercase
                        tracking-[0.14em]
                        text-amber
                      "
                    >
                      Popular
                    </span>
                  </div>
                )}

                {/* ========================================= */}
                {/* ICON + NUMBER                              */}
                {/* ========================================= */}

                <div className="flex items-start justify-between gap-3">
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-amber/20
                      bg-amber/10
                      text-amber
                      sm:h-12
                      sm:w-12
                    "
                  >
                    <Icon
                      className="
                        h-5.5
                        w-5.5
                        sm:h-6
                        sm:w-6
                      "
                      strokeWidth={1.7}
                    />
                  </div>

                  <span
                    className="
                      shrink-0
                      font-mono
                      text-[9px]
                      tracking-[0.16em]
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* ========================================= */}
                {/* PLAN INFORMATION                           */}
                {/* ========================================= */}

                <div className="mt-5 min-w-0">
                  <span
                    className="
                      block
                      truncate
                      font-mono
                      text-[8px]
                      uppercase
                      tracking-[0.16em]
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                  >
                    {plan.label}
                  </span>

                  <h3
                    className="
                      mt-1.5
                      font-display
                      text-xl
                      font-semibold
                      text-graphite
                      dark:text-mist
                    "
                  >
                    {plan.name}
                  </h3>

                  <p
                    className="
                      mt-1
                      truncate
                      text-[11px]
                      leading-5
                      text-graphite-muted
                      dark:text-mist-muted
                      sm:text-xs
                    "
                  >
                    {plan.description}
                  </p>
                </div>

                {/* ========================================= */}
                {/* PRICE                                      */}
                {/* ========================================= */}

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span
                    className="
                      font-display
                      text-3xl
                      font-semibold
                      tracking-[-0.04em]
                      text-graphite
                      dark:text-mist
                    "
                  >
                    {plan.price}
                  </span>

                  <span
                    className="
                      text-[10px]
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                  >
                    {plan.period}
                  </span>
                </div>

                {/* ========================================= */}
                {/* DIVIDER                                    */}
                {/* ========================================= */}

                <div
                  className="
                    my-4
                    h-px
                    bg-paper-border
                    dark:bg-ink-border
                  "
                />

                {/* ========================================= */}
                {/* FEATURES                                   */}
                {/* ========================================= */}

                <div
                  className="
                    min-h-[112px]
                    space-y-2
                  "
                >
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="
                        flex
                        min-w-0
                        items-start
                        gap-2
                      "
                    >
                      <Check
                        className="
                          mt-0.5
                          h-3.5
                          w-3.5
                          shrink-0
                          text-amber
                        "
                        strokeWidth={2}
                      />

                      <span
                        className="
                          min-w-0
                          text-[11px]
                          leading-5
                          text-graphite-muted
                          dark:text-mist-muted
                          sm:text-xs
                        "
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ========================================= */}
                {/* BUTTON                                     */}
                {/* ========================================= */}

                <a
                  href={plan.href}
                  className={`
                    mt-auto
                    flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    rounded-full
                    text-xs
                    font-semibold
                    transition-all
                    duration-200
                    ${
                      plan.popular
                        ? "bg-amber text-ink hover:scale-[1.02] hover:bg-amber/90 active:scale-[0.98]"
                        : "border border-paper-border bg-paper text-graphite hover:border-amber/40 hover:text-amber dark:border-ink-border dark:bg-ink dark:text-mist dark:hover:border-amber/40 dark:hover:text-amber"
                    }
                  `}
                >
                  {plan.button}
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
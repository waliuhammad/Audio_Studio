"use client";

import { useState } from "react";
import { Check } from "lucide-react";

/*
 * The run limits here mirror Firebase Remote Config, which is where they are
 * actually enforced. If the numbers are changed in the console this copy has
 * to follow — a plan advertising a limit it does not have is worse than not
 * naming one at all.
 *
 * The PRICES here must match what you set on each Lemon Squeezy variant. The
 * page only shows them; the actual amount charged is whatever the variant is
 * configured for. The yearly numbers in lib/pricing/plans.ts assume "two months free" (10× the
 * monthly price) — change them to whatever your yearly variants cost.
 */

import {
    PLANS,
    type BillingInterval,
    type PlanCard,
} from "@/lib/pricing/plans";

/** Shown next to "Yearly" in the toggle. Adjust to match your real discount. */
const YEARLY_SAVINGS_LABEL = "Save 20%";

/**
 * One-line taglines shown under the price, keyed by plan id — matching the
 * reference design. plans.ts doesn't carry this copy today, so it lives here;
 * move it into plan data instead if you'd rather keep all plan copy in one
 * place.
 */
const TAGLINES: Record<string, string> = {
  free: "Perfect for trying basic audio tools.",
  pro: "More power for regular workflows.",
  business: "Built for demanding media work.",
};

/**
 * Where a card's button points.
 *
 * Free starts sign-up. Paid plans hit the checkout route, which decides the
 * variant server-side and either creates a Lemon Squeezy checkout (signed in)
 * or bounces through sign-up first (signed out). No account context is needed
 * here, so this component still works on the public home page.
 */
function hrefFor(plan: PlanCard, interval: BillingInterval): string {
  if (plan.id === "free") return "/sign-up";

  return `/checkout?plan=${plan.id}&interval=${interval}`;
}

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <section
      id="pricing"
      className="
        container-studio
        scroll-mt-32
        py-14
        sm:scroll-mt-40
        sm:py-18
        lg:scroll-mt-44
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
      {/* BILLING TOGGLE                                    */}
      {/* ================================================= */}

      <div className="mt-8 flex justify-center sm:mt-10">
        <div
          className="
            inline-flex
            items-center
            gap-1
            rounded-full
            border
            border-paper-border
            bg-paper-surface
            p-1
            dark:border-ink-border
            dark:bg-ink-surface
          "
        >
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`
              rounded-full
              px-4
              py-2
              text-sm
              font-semibold
              transition-colors
              duration-200
              ${
                interval === "monthly"
                  ? "bg-graphite text-paper dark:bg-mist dark:text-ink"
                  : "text-graphite-muted hover:text-graphite dark:text-mist-muted dark:hover:text-mist"
              }
            `}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`
              flex
              items-center
              gap-1.5
              rounded-full
              px-4
              py-2
              text-sm
              font-semibold
              transition-colors
              duration-200
              ${
                interval === "yearly"
                  ? "bg-graphite text-paper dark:bg-mist dark:text-ink"
                  : "text-graphite-muted hover:text-graphite dark:text-mist-muted dark:hover:text-mist"
              }
            `}
          >
            Yearly

            <span
              className={`
                text-xs
                font-semibold
                ${interval === "yearly" ? "text-amber" : "text-teal"}
              `}
            >
              {YEARLY_SAVINGS_LABEL}
            </span>
          </button>
        </div>
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
        {PLANS.map((plan) => {
          const tagline = TAGLINES[plan.id];

          return (
            <div
              key={plan.name}
              className="
                reveal-on-scroll
                flex
                h-full
                min-w-[88%]
                shrink-0
                snap-start
                pt-3
                sm:min-w-[65%]
                lg:min-w-0
                lg:shrink
              "
            >
              <div
                className={`
                  relative
                  flex
                  min-h-[440px]
                  w-full
                  min-w-0
                  flex-1
                  flex-col
                  rounded-2xl
                  border
                  bg-paper-surface
                  p-6
                  transition-all
                  duration-300
                  dark:bg-ink-surface
                  ${
                    plan.popular
                      ? "border-amber shadow-[0_0_0_1px_rgba(217,119,6,0.15)]"
                      : "border-paper-border hover:border-amber/30 dark:border-ink-border dark:hover:border-amber/30"
                  }
                `}
              >
                {/* ========================================= */}
                {/* POPULAR                                    */}
                {/* ========================================= */}

                {plan.popular && (
                  <span
                    className="
                      absolute
                      -top-3
                      left-1/2
                      -translate-x-1/2
                      whitespace-nowrap
                      rounded-full
                      bg-amber
                      px-3.5
                      py-1
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.06em]
                      text-ink
                      shadow-sm
                    "
                  >
                    Most Popular
                  </span>
                )}

                {/* ========================================= */}
                {/* PLAN NAME                                  */}
                {/* ========================================= */}

                <h3
                  className="
                    font-display
                    text-xl
                    font-semibold
                    text-graphite
                    dark:text-mist
                  "
                >
                  {plan.name}
                </h3>

                {/* ========================================= */}
                {/* PRICE                                      */}
                {/* ========================================= */}

                <div className="mt-3 flex items-baseline gap-1">
                  <span
                    className="
                      font-display
                      text-4xl
                      font-bold
                      tracking-[-0.03em]
                      text-graphite
                      dark:text-mist
                    "
                  >
                    {plan.price[interval]}
                  </span>

                  <span
                    className="
                      text-sm
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                  >
                    /{plan.period[interval]}
                  </span>
                </div>

                {/* ========================================= */}
                {/* TAGLINE                                    */}
                {/* ========================================= */}

                {tagline && (
                  <p
                    className="
                      mt-2
                      text-sm
                      text-graphite-muted
                      dark:text-mist-muted
                    "
                  >
                    {tagline}
                  </p>
                )}

                {/* ========================================= */}
                {/* FEATURES                                   */}
                {/* ========================================= */}

                <div
                  className="
                    mb-6
                    mt-5
                    space-y-2.5
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
                          h-4
                          w-4
                          shrink-0
                          text-amber
                        "
                        strokeWidth={2.5}
                      />

                      <span
                        className="
                          min-w-0
                          text-sm
                          leading-6
                          text-graphite-muted
                          dark:text-mist-muted
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
                  href={hrefFor(plan, interval)}
                  className={`
                    mt-auto
                    flex
                    h-11
                    w-full
                    items-center
                    justify-center
                    rounded-full
                    text-sm
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
            </div>
          );
        })}
      </div>

    </section>
  );
}
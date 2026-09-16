"use client";

import { Check, X, Zap } from "lucide-react";

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

/**
 * Shape of one row in COMPARISON. Declared here rather than imported because
 * plans.ts isn't guaranteed to export a named type for it — if it does,
 * prefer importing that one instead and delete this.
 */
type ComparisonRow = {
  feature: string;
  values: Record<string, string>;
};

const COMPARISON: ComparisonRow[] = Array.from(
  new Set(PLANS.flatMap((plan) => plan.features)),
).map((feature) => ({
  feature,
  values: Object.fromEntries(
    PLANS.map((plan) => [
      plan.id,
      plan.features.includes(feature) ? "Yes" : "No",
    ]),
  ),
}));

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
            <div
              key={plan.name}
              className="
                reveal-on-scroll
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
                  min-h-[440px]
                  w-full
                  min-w-0
                  flex-1
                  flex-col
                  rounded-xl
                  border
                  p-5
                  transition-all
                  duration-300
                  sm:p-6
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
                  <h3
                    className="
                      font-display
                      text-2xl
                      font-semibold
                      text-graphite
                      dark:text-mist
                      sm:text-[1.65rem]
                    "
                  >
                    {plan.name}
                  </h3>
                </div>

                {/* ========================================= */}
                {/* PRICE                                      */}
                {/* ========================================= */}

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span
                    className="
                      font-display
                      text-4xl
                      font-semibold
                      tracking-[-0.04em]
                      text-graphite
                      dark:text-mist
                      sm:text-[2.75rem]
                    "
                  >
                    {plan.price.monthly}
                  </span>

                  <span
                    className="
                      text-xs
                      text-graphite-faint
                      dark:text-mist-faint
                    "
                  >
                    {plan.period.monthly}
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
                        strokeWidth={2}
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
                  href={hrefFor(plan, "monthly")}
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

      {/* ================================================= */}
      {/* COMPARISON TABLE                                  */}
      {/* ================================================= */}

      <div className="mt-12 sm:mt-16">
        <h3
          className="
            font-display
            text-xl
            font-semibold
            tracking-[-0.02em]
            text-graphite
            dark:text-mist
            sm:text-2xl
          "
        >
          Compare plans
        </h3>

        <div
          className="
            mt-5
            overflow-x-auto
            overscroll-x-contain
            rounded-xl
            border
            border-paper-border
            bg-paper-surface
            dark:border-ink-border
            dark:bg-ink-surface
          "
        >
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-paper-border dark:border-ink-border">
                <th
                  scope="col"
                  className="
                    sticky
                    left-0
                    bg-paper-surface
                    px-4
                    py-4
                    font-mono
                    text-[9px]
                    font-normal
                    uppercase
                    tracking-[0.16em]
                    text-graphite-faint
                    dark:bg-ink-surface
                    dark:text-mist-faint
                  "
                >
                  Feature / limit
                </th>

                {PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className="px-4 py-4 align-bottom"
                  >
                    <span
                      className={`
                        block
                        font-display
                        text-sm
                        font-semibold
                        ${plan.popular ? "text-amber" : "text-graphite dark:text-mist"}
                      `}
                    >
                      {plan.name}
                    </span>

                    <span className="mt-0.5 block text-[11px] font-normal text-graphite-muted dark:text-mist-muted">
                      {plan.price.monthly} / mo
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {COMPARISON.map((row: ComparisonRow) => (
                <tr
                  key={row.feature}
                  className="border-b border-paper-border last:border-b-0 dark:border-ink-border"
                >
                  <th
                    scope="row"
                    className="
                      sticky
                      left-0
                      bg-paper-surface
                      px-4
                      py-3.5
                      text-xs
                      font-semibold
                      text-graphite
                      dark:bg-ink-surface
                      dark:text-mist
                    "
                  >
                    {row.feature}
                  </th>

                  {PLANS.map((plan) => (
                    <td
                      key={plan.id}
                      className="
                        px-4
                        py-3.5
                        text-xs
                        leading-5
                        text-graphite-muted
                        dark:text-mist-muted
                      "
                    >
                      <ComparisonValue value={row.values[plan.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** A table cell, with a mark for the yes/no and one-file/batch rows. */
function ComparisonValue({ value }: { value: string | undefined }) {
  if (value === undefined) return <>—</>;

  if (value === "Yes" || value === "No") {
    const yes = value === "Yes";
    const Icon = yes ? Check : X;

    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${yes ? "text-teal" : "text-coral"}`}
          strokeWidth={2.2}
        />
        {value}
      </span>
    );
  }

  if (value.startsWith("Up to") && value.includes("files")) {
    return (
      <span className="inline-flex items-start gap-1.5">
        <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" strokeWidth={2} />
        {value}
      </span>
    );
  }

  if (value === "1 file at a time") {
    return (
      <span className="inline-flex items-start gap-1.5">
        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" strokeWidth={2.2} />
        {value}
      </span>
    );
  }

  return <>{value}</>;
}
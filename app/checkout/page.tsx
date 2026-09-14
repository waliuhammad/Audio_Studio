import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/firebase/session";
import { PLANS, planById, intervalFrom } from "@/lib/pricing/plans";

export const metadata = {
  title: "Checkout | Audio Studio",
  description: "Confirm your plan before payment.",
};

/**
 * The confirmation step between picking a plan and Lemon Squeezy.
 *
 * The pricing buttons used to jump straight to /api/billing/checkout, which
 * redirects to an external payment page — so the first thing a customer saw
 * after clicking was somebody else's domain, with no statement of what they
 * were buying or which account it applied to. This says both, in our own
 * styling, before anything leaves the site.
 *
 * A server component: it needs the session to name the account, and reading it
 * here means the page cannot flash a wrong answer while it loads.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string; interval?: string };
}) {
  const plan = planById(searchParams.plan ?? "");
  const interval = intervalFrom(searchParams.interval);

  // An unknown plan, or the free one, has nothing to confirm.
  if (!plan) redirect("/#pricing");
  if (plan.id === "free") redirect("/sign-up");

  const user = await getSessionUser();

  /*
   * Signed out, send them to sign up and straight back here — the same round
   * trip the checkout route performs, done before payment rather than after,
   * so nobody meets a login wall with a card already in hand.
   */
  if (!user) {
    const next = `/checkout?plan=${plan.id}&interval=${interval}`;
    redirect(`/sign-up?next=${encodeURIComponent(next)}`);
  }

  const Icon = plan.icon;
  const price = plan.price[interval];
  const period = plan.period[interval];
  const note = plan.note?.[interval];
  const other = interval === "monthly" ? "yearly" : "monthly";

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
            href="/#pricing"
            className="group flex items-center gap-2 text-[13px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              strokeWidth={1.8}
            />
            <span className="hidden sm:inline">Back to plans</span>
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
              Checkout
            </div>

            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl dark:text-mist">
              Confirm your plan.
            </h1>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-graphite-muted sm:text-sm dark:text-mist-muted">
              Payment is handled by Lemon Squeezy. You will be taken there to
              enter card details, and returned here when it is done.
            </p>
          </div>

          {/* ============================================= */}
          {/* ORDER SUMMARY                                 */}
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
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                </span>

                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold tracking-tight text-graphite dark:text-mist">
                    {plan.name}
                  </p>
                  <p className="text-[12px] text-graphite-muted dark:text-mist-muted">
                    {plan.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-graphite dark:text-mist">
                  {price}
                  <span className="ml-1 text-[12px] font-medium text-graphite-muted dark:text-mist-muted">
                    {period}
                  </span>
                </p>

                {note && (
                  <p className="mt-1 text-[11px] text-graphite-muted dark:text-mist-muted">
                    {note}
                  </p>
                )}
              </div>
            </div>

            {/* Billing to */}
            <dl className="mt-6 flex flex-col gap-2.5 border-t border-paper-border pt-5 dark:border-ink-border">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                  Billed to
                </dt>
                <dd className="min-w-0 truncate text-[12px] font-medium text-graphite dark:text-mist">
                  {user.email}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                  Billing period
                </dt>
                <dd className="text-[12px] font-medium capitalize text-graphite dark:text-mist">
                  {interval}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] text-graphite-muted dark:text-mist-muted">
                  Renews
                </dt>
                <dd className="text-[12px] font-medium text-graphite dark:text-mist">
                  Automatically, cancel any time
                </dd>
              </div>
            </dl>

            {/* What is included */}
            <div className="mt-6 border-t border-paper-border pt-5 dark:border-ink-border">
              <p className="mb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-graphite-faint dark:text-mist-faint">
                What you get
              </p>

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[12px] leading-5 text-graphite-muted dark:text-mist-muted"
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber"
                      strokeWidth={2.2}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={`/api/billing/checkout?plan=${plan.id}&interval=${interval}`}
                className="
                  group
                  flex
                  h-12
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
                "
              >
                <Lock className="h-4 w-4" strokeWidth={2} />
                Continue to payment
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </a>

              {/*
                Switching interval is a link back to this same page rather than
                a control of its own — there is no state to keep, and it means
                the summary and the price can never disagree.
              */}
              <Link
                href={`/checkout?plan=${plan.id}&interval=${other}`}
                className="text-center text-[12px] font-medium text-graphite-muted underline underline-offset-2 transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
              >
                Switch to {other} billing
              </Link>
            </div>

            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
              <ShieldCheck
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber"
                strokeWidth={1.7}
              />
              Card details are entered on Lemon Squeezy and never reach our
              servers. Cancel whenever you like from Settings.
            </p>
          </div>

          {/* ============================================= */}
          {/* OTHER PLANS                                   */}
          {/* ============================================= */}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-graphite-muted dark:text-mist-muted">
              Changed your mind?
            </p>

            <div className="flex flex-wrap gap-2">
              {PLANS.filter(
                (other) => other.id !== "free" && other.id !== plan.id
              ).map((other) => (
                <Link
                  key={other.id}
                  href={`/checkout?plan=${other.id}&interval=${interval}`}
                  className="
                    rounded-full
                    border
                    border-paper-border
                    px-3.5
                    py-1.5
                    text-[11px]
                    font-medium
                    text-graphite-muted
                    transition-colors
                    hover:border-amber/50
                    hover:text-amber
                    dark:border-ink-border
                    dark:text-mist-muted
                    dark:hover:border-amber/50
                    dark:hover:text-amber
                  "
                >
                  {other.name} — {other.price[interval]}
                </Link>
              ))}

              <Link
                href="/#pricing"
                className="
                  rounded-full
                  border
                  border-paper-border
                  px-3.5
                  py-1.5
                  text-[11px]
                  font-medium
                  text-graphite-muted
                  transition-colors
                  hover:border-amber/50
                  hover:text-amber
                  dark:border-ink-border
                  dark:text-mist-muted
                  dark:hover:border-amber/50
                  dark:hover:text-amber
                "
              >
                Compare all plans
              </Link>
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

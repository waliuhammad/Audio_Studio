import {
    Crown,
    Sparkles,
    Zap,
} from "lucide-react";

/*
 * Plan copy and prices, shared by the pricing section and the checkout page.
 *
 * It lived inside Pricing.tsx, which meant the checkout summary would have had
 * to repeat every price to show what someone is buying — and two copies of a
 * price drift, so a customer could be shown one number and charged another.
 *
 * These strings are DISPLAY ONLY. The amount actually charged is whatever the
 * Lemon Squeezy variant is configured for; keep them in step by hand.
 */

export type BillingInterval = "monthly" | "yearly";

export interface PlanCard {
  /**
   * Which plan this card buys. "free" is not sold — its button just starts
   * sign-up. "pro" and "business" build a checkout link for the paid variant.
   */
  id: "free" | "pro" | "business";
  name: string;
  label: string;
  icon: typeof Sparkles;
  description: string;
  /** Price shown per interval, and the small line under it. */
  price: Record<BillingInterval, string>;
  period: Record<BillingInterval, string>;
  /** Extra note under the price, e.g. the effective monthly rate on yearly. */
  note?: Partial<Record<BillingInterval, string>>;
  features: string[];
  button: string;
  popular?: boolean;
}

export const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    label: "For getting started",
    icon: Sparkles,
    description: "Essential tools for simple projects.",
    price: { monthly: "$0", yearly: "$0" },
    period: { monthly: "forever", yearly: "forever" },
    features: [
      "10 tool runs per day",
      "2 GB storage",
      "Basic audio & video tools",
      "Standard export formats",
      "Essential file processing",
    ],
    button: "Start Free",
  },
  {
    id: "pro",
    name: "Pro",
    label: "For regular creators",
    icon: Zap,
    description: "More power for regular workflows.",
    price: { monthly: "$9", yearly: "$90" },
    period: { monthly: "/ month", yearly: "/ year" },
    note: { yearly: "≈ $7.50 / month, billed yearly" },
    features: [
      "25 tool runs per day",
      "5 GB storage",
      "Everything in Free",
      "All audio & video tools",
      "Higher file limits",
      "Faster processing",
      "Premium exports",
    ],
    button: "Go Pro",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    label: "For heavy workflows",
    icon: Crown,
    description: "Built for demanding media work.",
    price: { monthly: "$19", yearly: "$190" },
    period: { monthly: "/ month", yearly: "/ year" },
    note: { yearly: "≈ $15.83 / month, billed yearly" },
    features: [
      "100 tool runs per day",
      "20 GB storage",
      "Everything in Pro",
      "Maximum file limits",
      "Priority processing",
      "Advanced workflows",
      "Priority support",
    ],
    button: "Choose Business",
  },
];

/** Look a plan up by its id, or null when the id is not one we sell. */
export function planById(id: string): PlanCard | null {
    return PLANS.find((plan) => plan.id === id) ?? null;
}

/** Narrow an arbitrary string to a billing interval, defaulting to monthly. */
export function intervalFrom(value: string | undefined): BillingInterval {
    return value === "yearly" ? "yearly" : "monthly";
}

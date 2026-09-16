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
    label: "Quick edits & trial users",
    icon: Sparkles,
    description: "Essential tools for simple projects.",
    price: { monthly: "$0", yearly: "$0" },
    period: { monthly: "forever", yearly: "forever" },
    features: [
      "10 operations per day",
      "10 basic audio operations / day",
      "1 advanced audio operation / day",
      "1 video operation / day (max 50 MB)",
      "Limited silence removal, speed & pitch",
      "1 file at a time",
      "2 GB storage",
      "Community support",
    ],
    button: "Start Free",
  },
  {
    id: "pro",
    name: "Pro",
    label: "Creators & podcasters",
    icon: Zap,
    description: "More power for regular workflows.",
    price: { monthly: "$12.99", yearly: "$129.90" },
    period: { monthly: "/ month", yearly: "/ year" },
    note: { yearly: "≈ $10.83 / month, billed yearly" },
    features: [
      "50 operations per day",
      "50 basic & 30 advanced audio operations / day",
      "5 video operations / day (max 500 MB)",
      "5 silence removal, speed & pitch runs / day",
      "Batch up to 5 files at once",
      "5 GB storage",
      "Ad-free, high-speed processing",
      "Priority support",
    ],
    button: "Go Pro",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    label: "Video editors, teams & agencies",
    icon: Crown,
    description: "Built for demanding media work.",
    price: { monthly: "$38.99", yearly: "$389.90" },
    period: { monthly: "/ month", yearly: "/ year" },
    note: { yearly: "≈ $32.49 / month, billed yearly" },
    features: [
      "100 operations per day",
      "100 basic & 60 advanced audio operations / day",
      "10 video operations / day (max 2 GB)",
      "10 silence removal, speed & pitch runs / day",
      "Batch up to 20 files at once",
      "20 GB storage",
      "Up to 5 team members",
      "Maximum priority · 24/7 dedicated support",
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

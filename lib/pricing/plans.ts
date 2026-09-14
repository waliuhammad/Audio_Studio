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
      "10 tool runs per day",
      "2 GB storage",
      "1 video operation per day (max 50 MB)",
      "1 file at a time",
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
      "50 tool runs per day",
      "5 GB storage",
      "5 video operations per day (max 500 MB)",
      "Batch up to 5 files",
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
      "100 tool runs per day",
      "20 GB storage",
      "10 video operations per day (max 2 GB)",
      "Batch up to 20 files",
      "Up to 5 team members",
      "Maximum processing priority",
      "24/7 dedicated support",
    ],
    button: "Choose Business",
  },
];

/*
 * The full side-by-side comparison shown under the plan cards.
 *
 * Only "Total operations / day" is enforced today (Remote Config, see
 * lib/server/plan-limits.ts). The other rows describe the plans as sold and
 * need their own enforcement before they are true — keep this table and the
 * server in step.
 */

export interface ComparisonRow {
  feature: string;
  values: Record<PlanCard["id"], string>;
}

export const COMPARISON: ComparisonRow[] = [
  {
    feature: "Target audience",
    values: {
      free: "Quick edits & trial users",
      pro: "Individual creators & podcasters",
      business: "Video editors, teams & agencies",
    },
  },
  {
    feature: "Total operations / day",
    values: { free: "10 runs/day", pro: "50 runs/day", business: "100 runs/day" },
  },
  {
    feature: "Basic audio operations",
    values: { free: "10 per day", pro: "50 per day", business: "100 per day" },
  },
  {
    feature: "Advanced audio operations",
    values: { free: "1 per day", pro: "30 per day", business: "60 per day" },
  },
  {
    feature: "Video processing operations",
    values: {
      free: "1 per day (max 50 MB)",
      pro: "5 per day (max 500 MB)",
      business: "10 per day (max 2 GB)",
    },
  },
  {
    feature: "Silence removal / speed / pitch",
    values: { free: "Limited", pro: "5 per day", business: "10 per day" },
  },
  {
    feature: "Batch processing",
    values: {
      free: "1 file at a time",
      pro: "Up to 5 files simultaneously",
      business: "Up to 20 files simultaneously",
    },
  },
  {
    feature: "Team members",
    values: { free: "1 user", pro: "1 user", business: "Up to 5 team members" },
  },
  {
    feature: "Ad-free experience",
    values: { free: "No", pro: "Yes", business: "Yes" },
  },
  {
    feature: "Processing priority",
    values: { free: "Standard", pro: "High speed", business: "Maximum priority" },
  },
  {
    feature: "Support",
    values: {
      free: "Community support",
      pro: "Priority support",
      business: "24/7 dedicated support",
    },
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

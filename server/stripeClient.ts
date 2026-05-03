import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

export const STRIPE_PLANS = {
  pro: {
    monthly: "price_pro_monthly",
    yearly: "price_pro_yearly",
  },
  business: {
    monthly: "price_business_monthly",
    yearly: "price_business_yearly",
  },
} as const;

export type PlanKey = "pro" | "business";
export type BillingInterval = "monthly" | "yearly";

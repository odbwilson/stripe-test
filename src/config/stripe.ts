import { loadStripe } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

export const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT ?? "http://localhost:3000";

export const SUBSCRIPTION_API_ENDPOINT =
  import.meta.env.VITE_SUBSCRIPTION_API_ENDPOINT ?? "http://localhost:3000";

import type { Handler } from "aws-lambda";
import Stripe from "stripe";

const PRICE_AMOUNT = 2000;
const PRICE_CURRENCY = "hkd";
const TRIAL_DAYS = 1;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function toISO(ts: number | null | undefined): string | null {
  if (ts == null || isNaN(ts)) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

function parseBody(event: any): any {
  if (event.body) {
    return JSON.parse(event.body);
  }
  return event ?? {};
}

export const handler: Handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Stripe secret key not configured" }),
    };
  }

  const stripe = new Stripe(stripeSecretKey);
  const { type, ...params } = parseBody(event);

  try {
    switch (type) {
      case "create-customer":
        return await handleCreateCustomer(stripe, params, corsHeaders);
      case "create-subscription":
        return await handleCreateSubscription(stripe, params, corsHeaders);
      case "get-subscription":
        return await handleGetSubscription(stripe, params, corsHeaders);
      case "cancel-subscription":
        return await handleCancelSubscription(stripe, params, corsHeaders);
      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: `Unknown type: ${type}. Use: create-customer, create-subscription, get-subscription, cancel-subscription`,
          }),
        };
    }
  } catch (error) {
    console.error(`Error in ${type}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};

async function handleCreateCustomer(
  stripe: Stripe,
  params: any,
  headers: Record<string, string>
) {
  const { email, name } = params;

  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Email is required" }),
    };
  }

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
  });

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      customerId: customer.id,
      clientSecret: setupIntent.client_secret,
    }),
  };
}

async function handleCreateSubscription(
  stripe: Stripe,
  params: any,
  headers: Record<string, string>
) {
  const { customerId, paymentMethodId } = params;

  if (!customerId || !paymentMethodId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "customerId and paymentMethodId are required",
      }),
    };
  }

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  const product = await stripe.products.create({
    name: "Monthly Subscription",
  });

  const price = await stripe.prices.create({
    currency: PRICE_CURRENCY,
    product: product.id,
    unit_amount: PRICE_AMOUNT,
    recurring: { interval: "day" },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    trial_period_days: TRIAL_DAYS,
    payment_settings: {
      payment_method_types: ["card"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice"],
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialStart: toISO(subscription.trial_start),
      trialEnd: toISO(subscription.trial_end),
      currentPeriodStart: toISO(subscription.current_period_start),
      currentPeriodEnd: toISO(subscription.current_period_end),
      planAmount: PRICE_AMOUNT,
      currency: PRICE_CURRENCY,
    }),
  };
}

async function handleCancelSubscription(
  stripe: Stripe,
  params: any,
  headers: Record<string, string>
) {
  const { subscriptionId } = params;

  if (!subscriptionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "subscriptionId is required" }),
    };
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      subscriptionId: subscription.id,
      status: subscription.status,
      canceledAt: toISO(subscription.canceled_at),
    }),
  };
}

async function handleGetSubscription(
  stripe: Stripe,
  params: any,
  headers: Record<string, string>
) {
  const { customerId } = params;

  if (!customerId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "customerId is required" }),
    };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      subscriptions: subscriptions.data.map((sub) => ({
        id: sub.id,
        status: sub.status,
        trialStart: toISO(sub.trial_start),
        trialEnd: toISO(sub.trial_end),
        currentPeriodStart: toISO(sub.current_period_start),
        currentPeriodEnd: toISO(sub.current_period_end),
        canceledAt: toISO(sub.canceled_at),
        planAmount: sub.items.data[0]?.price?.unit_amount ?? null,
        currency: sub.items.data[0]?.price?.currency ?? null,
      })),
    }),
  };
}

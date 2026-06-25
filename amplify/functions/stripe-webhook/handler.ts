import type { Handler } from "aws-lambda";
import Stripe from "stripe";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function toISO(ts: number | null | undefined): string | null {
  if (ts == null || isNaN(ts)) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

async function findSubscriptionRecord(
  tableName: string,
  stripeSubscriptionId: string
): Promise<Record<string, any> | null> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "stripeSubscriptionId = :sid",
      ExpressionAttributeValues: {
        ":sid": stripeSubscriptionId,
      },
    })
  );

  return result.Items?.[0] ?? null;
}

async function upsertSubscriptionRecord(
  tableName: string,
  sub: Stripe.Subscription
) {
  const existing = await findSubscriptionRecord(tableName, sub.id);

  const fields = {
    stripeSubscriptionId: sub.id,
    stripeCustomerId: (sub.customer as string) ?? "",
    status: sub.status,
    planAmount: sub.items.data[0]?.price?.unit_amount ?? 2000,
    currency: sub.items.data[0]?.price?.currency ?? "hkd",
    trialStart: toISO(sub.trial_start),
    trialEnd: toISO(sub.trial_end),
    currentPeriodStart: toISO(sub.current_period_start),
    currentPeriodEnd: toISO(sub.current_period_end),
    canceledAt: toISO(sub.canceled_at),
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: existing.id },
        UpdateExpression:
          "SET #status = :status, stripeCustomerId = :scid, " +
          "planAmount = :pa, #cur = :cur, trialStart = :ts, trialEnd = :te, " +
          "currentPeriodStart = :cps, currentPeriodEnd = :cpe, " +
          "canceledAt = :ca, updatedAt = :ua",
        ExpressionAttributeNames: {
          "#status": "status",
          "#cur": "currency",
        },
        ExpressionAttributeValues: {
          ":status": fields.status,
          ":scid": fields.stripeCustomerId,
          ":pa": fields.planAmount,
          ":cur": fields.currency,
          ":ts": fields.trialStart,
          ":te": fields.trialEnd,
          ":cps": fields.currentPeriodStart,
          ":cpe": fields.currentPeriodEnd,
          ":ca": fields.canceledAt,
          ":ua": fields.updatedAt,
        },
      })
    );
    console.log("Updated subscription record:", sub.id, "->", sub.status);
  } else {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id: generateId(),
          owner: fields.stripeCustomerId,
          ...fields,
          createdAt: fields.updatedAt,
        },
      })
    );
    console.log("Created subscription record:", sub.id, "->", sub.status);
  }
}

export const handler: Handler = async (event) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const subTableName = process.env.STRIPE_SUBSCRIPTION_TABLE_NAME;

  if (!stripeSecretKey || !webhookSecret || !subTableName) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Stripe configuration missing" }),
    };
  }

  const stripe = new Stripe(stripeSecretKey);
  const sig = event.headers["stripe-signature"];

  if (!sig) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing stripe-signature header" }),
    };
  }

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );

    console.log(`Event received: ${stripeEvent.type}`);

    switch (stripeEvent.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        await upsertSubscriptionRecord(subTableName, sub);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionRecord(subTableName, sub);
          console.log("Invoice paid, subscription updated:", subId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          // Fetch the subscription to get its current status (likely past_due)
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionRecord(subTableName, sub);
          console.log("Invoice failed, subscription updated:", subId);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", pi.id, "amount:", pi.amount);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = stripeEvent.data.object as Stripe.PaymentIntent;
        console.error(
          "Payment failed:",
          pi.id,
          pi.last_payment_error?.message
        );
        break;
      }
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error("Webhook error:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Webhook signature verification failed",
      }),
    };
  }
};

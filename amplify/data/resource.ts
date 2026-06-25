import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Payment: a
    .model({
      paymentIntentId: a.string().required(),
      amount: a.integer().required(),
      currency: a.string().required(),
      status: a.string().required(),
      userId: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  StripeCustomer: a
    .model({
      email: a.email().required(),
      name: a.string(),
      stripeCustomerId: a.string().required(),
      defaultPaymentMethodId: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  StripeSubscription: a
    .model({
      stripeCustomerId: a.string().required(),
      stripeSubscriptionId: a.string().required(),
      status: a.string().required(),
      planAmount: a.integer().required(),
      currency: a.string().required(),
      trialStart: a.datetime(),
      trialEnd: a.datetime(),
      currentPeriodStart: a.datetime(),
      currentPeriodEnd: a.datetime(),
      canceledAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

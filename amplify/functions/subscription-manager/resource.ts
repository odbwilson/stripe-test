import { defineFunction, secret } from "@aws-amplify/backend";

export const subscriptionManager = defineFunction({
  name: "subscription-manager",
  entry: "./handler.ts",
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
  },
  timeoutSeconds: 30,
});

import { defineFunction, secret } from "@aws-amplify/backend";

export const createPaymentIntent = defineFunction({
  name: "create-payment-intent",
  entry: "./handler.ts",
  environment: {
    STRIPE_SECRET_KEY: secret("STRIPE_SECRET_KEY"),
  },
  timeoutSeconds: 30,
});

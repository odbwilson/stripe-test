import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { createPaymentIntent } from "./functions/create-payment-intent/resource";
import { stripeWebhook } from "./functions/stripe-webhook/resource";
import { subscriptionManager } from "./functions/subscription-manager/resource";
import * as lambda from "aws-cdk-lib/aws-lambda";

const backend = defineBackend({
  auth,
  data,
  createPaymentIntent,
  stripeWebhook,
  subscriptionManager,
});

const createPaymentIntentLambda =
  backend.createPaymentIntent.resources.lambda;
const stripeWebhookLambda = backend.stripeWebhook.resources.lambda;
const subscriptionManagerLambda =
  backend.subscriptionManager.resources.lambda;

const paymentFnUrl = createPaymentIntentLambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});
const subscriptionFnUrl = subscriptionManagerLambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});
const webhookFnUrl = stripeWebhookLambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});

backend.data.resources.graphqlApi.addLambdaDataSource(
  "createPaymentIntentDataSource",
  createPaymentIntentLambda
);

backend.data.resources.graphqlApi.addLambdaDataSource(
  "stripeWebhookDataSource",
  stripeWebhookLambda
);

backend.data.resources.graphqlApi.addLambdaDataSource(
  "subscriptionManagerDataSource",
  subscriptionManagerLambda
);

// Grant webhook Lambda read/write access to DynamoDB tables
const stripeSubTable = backend.data.resources.tables["StripeSubscription"];
const stripeCustomerTable = backend.data.resources.tables["StripeCustomer"];
stripeSubTable.grantReadWriteData(stripeWebhookLambda);
stripeCustomerTable.grantReadWriteData(stripeWebhookLambda);

stripeWebhookLambda.addEnvironment(
  "STRIPE_SUBSCRIPTION_TABLE_NAME",
  stripeSubTable.tableName
);
stripeWebhookLambda.addEnvironment(
  "STRIPE_CUSTOMER_TABLE_NAME",
  stripeCustomerTable.tableName
);

backend.addOutput({
  createPaymentIntentUrl: paymentFnUrl.url,
  subscriptionApiUrl: subscriptionFnUrl.url,
  webhookUrl: webhookFnUrl.url,
});

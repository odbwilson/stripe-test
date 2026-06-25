import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise, SUBSCRIPTION_API_ENDPOINT } from "../config/stripe";
import { SetupForm } from "./SetupForm";

type Step = "form" | "loading" | "setup" | "confirming" | "complete" | "error";

interface SubscriptionSignupProps {
  userEmail: string;
  onComplete: (subscriptionId: string) => void;
  onCustomerCreated: (customerId: string, email: string, name?: string) => void;
}

export function SubscriptionSignup({
  userEmail,
  onComplete,
  onCustomerCreated,
}: SubscriptionSignupProps) {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState(userEmail);
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApiError = (err: unknown, msg: string) => {
    setErrorMessage(err instanceof Error ? err.message : msg);
    setStep("error");
  };

  const createCustomer = async () => {
    if (!email) {
      setErrorMessage("Email is required");
      setStep("error");
      return;
    }

    setStep("loading");

    try {
      const response = await fetch(SUBSCRIPTION_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "create-customer", email, name: name || undefined }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to create customer");
      }

      const data = await response.json();
      setCustomerId(data.customerId);
      onCustomerCreated(data.customerId, email, name || undefined);
      setClientSecret(data.clientSecret);
      setStep("setup");
    } catch (error) {
      handleApiError(error, "Failed to create customer");
    }
  };

  const handleCardSaved = async (paymentMethodId: string) => {
    setStep("confirming");

    try {
      const response = await fetch(SUBSCRIPTION_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "create-subscription",
          customerId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to create subscription");
      }

      const data = await response.json();
      setSubscription(data);
      setStep("complete");
      onComplete(data.subscriptionId);
    } catch (error) {
      handleApiError(error, "Failed to create subscription");
    }
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
    setStep("error");
  };

  const reset = () => {
    setStep("form");
    setErrorMessage(null);
    setCustomerId(null);
    setClientSecret(null);
    setSubscription(null);
  };

  if (step === "complete" && subscription) {
    const trialEnd = subscription.trialEnd
      ? new Date(subscription.trialEnd).toLocaleDateString()
      : "N/A";

    return (
      <div className="card">
        <div className="status-icon">&#10003;</div>
        <h2>Subscription Created!</h2>
        <p>
          Your 1-day free trial has started. Trial ends:{" "}
          <strong>{trialEnd}</strong>
        </p>
        <p className="subscription-id">
          Subscription: {subscription.subscriptionId}
        </p>
        <p className="hint">
          After the trial, you'll be charged HK$20.00/day. Check the{" "}
          <strong>My Subscription</strong> tab for details.
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="card">
        <div className="status-icon status-icon--error">&#10007;</div>
        <h2>Error</h2>
        <p className="error-message">{errorMessage}</p>
        <button onClick={reset} className="reset-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      {step === "form" || step === "loading" ? (
        <div className="card">
          <h2>Start Free Trial</h2>
          <p>
            Enter your details to start a 1-day free trial. No charge today.
          </p>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step === "loading"}
              placeholder="you@example.com"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name (optional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={step === "loading"}
              placeholder="Your Name"
              className="text-input"
            />
          </div>

          <button
            onClick={createCustomer}
            disabled={step === "loading"}
            className="pay-button"
          >
            {step === "loading" ? "Loading..." : "Continue"}
          </button>
        </div>
      ) : null}

      {step === "setup" && clientSecret ? (
        <div className="card">
          <h2>Save Payment Method</h2>
          <p className="card-subtitle">
            Enter your card to start the 1-day free trial.
          </p>
          <p className="hint">
            Plan: <strong>HK$20.00/day</strong> &mdash; No charge until trial
            ends.
          </p>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <SetupForm
              clientSecret={clientSecret}
              onSuccess={handleCardSaved}
              onError={handleError}
            />
          </Elements>
        </div>
      ) : null}

      {step === "confirming" ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div className="spinner" />
          <p>Creating your subscription...</p>
        </div>
      ) : null}

      <div className="card card--info">
        <h3>How It Works</h3>
        <ol>
          <li>Enter your email and name</li>
          <li>Save a card — it won't be charged today</li>
          <li>1-day free trial starts immediately</li>
          <li>After trial, you'll be billed HK$20.00/day</li>
        </ol>
        <h3>Test Cards</h3>
        <ul>
          <li>
            <code>4242 4242 4242 4242</code> — Success
          </li>
          <li>
            <code>4000 0025 0000 3155</code> — 3DS required
          </li>
          <li>
            <code>4000 0000 0000 0002</code> — Decline
          </li>
        </ul>
        <p className="hint">
          Use any future expiry date and any 3-digit CVC.
        </p>
      </div>
    </>
  );
}

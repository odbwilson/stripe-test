import { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import { PaymentForm } from "./components/PaymentForm";
import { PaymentStatus } from "./components/PaymentStatus";
import { SubscriptionSignup } from "./components/SubscriptionSignup";
import { SubscriptionDashboard } from "./components/SubscriptionDashboard";
import { stripePromise, API_ENDPOINT } from "./config/stripe";
import type { Schema } from "../amplify/data/resource";
import "./App.css";

const client = generateClient<Schema>();

type Tab = "payment" | "subscribe" | "subscription";

type PaymentState = {
  status: "idle" | "loading" | "success" | "error";
  clientSecret?: string;
  paymentIntentId?: string;
  errorMessage?: string;
  amount: string;
};

const ACTIVE_STATUSES = ["active", "trialing"];

function App() {
  return (
    <Authenticator>
      <AppContent />
    </Authenticator>
  );
}

function AppContent() {
  const { user, signOut } = useAuthenticator();
  const [tab, setTab] = useState<Tab>("payment");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);
  const [payment, setPayment] = useState<PaymentState>({
    status: "idle",
    amount: "20.00",
  });

  const checkAccess = async () => {
    try {
      const { data: subs } = await client.models.StripeSubscription.list();
      const hasAccess = subs.some((s) =>
        ACTIVE_STATUSES.includes(s.status)
      );
      setSubscriptionActive(hasAccess);
      return hasAccess;
    } catch {
      setSubscriptionActive(false);
      return false;
    }
  };

  const loadCustomerId = async () => {
    try {
      const { data: customers } = await client.models.StripeCustomer.list();
      if (customers.length > 0) {
        setCustomerId(customers[0].stripeCustomerId);
      }
    } catch (e) {
      console.error("Failed to load customer ID", e);
    }
  };

  useEffect(() => {
    Promise.all([loadCustomerId(), checkAccess()]);
  }, [user]);

  const createPaymentIntent = async () => {
    setPayment((p) => ({ ...p, status: "loading", errorMessage: undefined }));

    try {
      const amountInCents = Math.round(parseFloat(payment.amount) * 100);

      const response = await fetch(`${API_ENDPOINT}/api/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInCents, currency: "hkd" }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to create payment");
      }

      const data = await response.json();
      setPayment((p) => ({
        ...p,
        status: "idle",
        clientSecret: data.clientSecret,
      }));
    } catch (error) {
      setPayment((p) => ({
        ...p,
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Something went wrong",
      }));
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPayment((p) => ({ ...p, status: "success", paymentIntentId }));
  };

  const handlePaymentError = (error: string) => {
    setPayment((p) => ({ ...p, status: "error", errorMessage: error }));
  };

  const resetPayment = () => {
    setPayment({ status: "idle", amount: "20.00" });
  };

  const handleCustomerCreated = async (id: string, email: string, name?: string) => {
    try {
      await client.models.StripeCustomer.create({
        email,
        name: name ?? undefined,
        stripeCustomerId: id,
      });
    } catch (e) {
      console.error("Failed to save customer ID", e);
    }
    setCustomerId(id);
  };

  const handleSubscriptionComplete = async (_subscriptionId: string) => {
    setTab("subscription");
    for (let i = 0; i < 10; i++) {
      const active = await checkAccess();
      if (active) return;
      await new Promise((r) => setTimeout(r, 2000));
    }
  };

  const handleSignOut = () => {
    setCustomerId(null);
    setSubscriptionActive(null);
    signOut();
  };

  const userEmail = user?.signInDetails?.loginId ?? "";

  if (subscriptionActive === null) {
    return (
      <div className="app">
        <div className="card" style={{ textAlign: "center", marginTop: "3rem" }}>
          <div className="spinner" />
          <p>Checking subscription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <h1>Stripe Test Suite</h1>
          <div className="user-info">
            <span className="user-email">{userEmail}</span>
            <button onClick={handleSignOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
        <nav className="tab-nav">
          <button
            onClick={() => setTab("payment")}
            disabled={!subscriptionActive}
            className={`tab ${tab === "payment" ? "tab--active" : ""}`}
          >
            One-Time Payment
          </button>
          {!subscriptionActive && (
            <button
              onClick={() => setTab("subscribe")}
              className={`tab ${tab === "subscribe" ? "tab--active" : ""}`}
            >
              Subscribe
            </button>
          )}
          {customerId && subscriptionActive && (
            <button
              onClick={() => setTab("subscription")}
              className={`tab ${tab === "subscription" ? "tab--active" : ""}`}
            >
              My Subscription
            </button>
          )}
        </nav>
      </header>

      <main className="app-main">
        {!subscriptionActive && tab !== "subscribe" && (
          <div className="card">
            <h2>Subscription Required</h2>
            <p>
              You need an active subscription to access this feature.
            </p>
            <button
              onClick={() => setTab("subscribe")}
              className="pay-button"
            >
              Subscribe Now
            </button>
          </div>
        )}

        {tab === "payment" && subscriptionActive && (
          <>
            {payment.clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: payment.clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <div className="card">
                  <h2>Complete Payment</h2>
                  <p className="card-subtitle">
                    Amount: <strong>HK${payment.amount}</strong>
                  </p>
                  <PaymentForm
                    clientSecret={payment.clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </div>
              </Elements>
            ) : (
              <div className="card">
                <h2>Test Payment</h2>
                <p>
                  Enter an amount and create a payment to test Stripe Elements.
                </p>

                <div className="amount-input-group">
                  <label htmlFor="amount">Amount (HKD)</label>
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={payment.amount}
                      onChange={(e) =>
                        setPayment((p) => ({ ...p, amount: e.target.value }))
                      }
                      disabled={payment.status === "loading"}
                    />
                  </div>
                </div>

                <button
                  onClick={createPaymentIntent}
                  disabled={payment.status === "loading"}
                  className="pay-button"
                >
                  {payment.status === "loading"
                    ? "Creating..."
                    : "Continue to Payment"}
                </button>
              </div>
            )}

            <PaymentStatus
              status={payment.status}
              paymentIntentId={payment.paymentIntentId}
              errorMessage={payment.errorMessage}
              onReset={resetPayment}
            />

            {!payment.clientSecret && payment.status === "idle" && (
              <div className="card card--info">
                <h3>Test Card Numbers</h3>
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
            )}
          </>
        )}

        {tab === "subscribe" && (
          <SubscriptionSignup
            userEmail={userEmail}
            onComplete={handleSubscriptionComplete}
            onCustomerCreated={handleCustomerCreated}
          />
        )}

        {tab === "subscription" && customerId && subscriptionActive && (
          <SubscriptionDashboard customerId={customerId} />
        )}
      </main>
    </div>
  );
}

export default App;

import { useState } from "react";
import { SUBSCRIPTION_API_ENDPOINT } from "../config/stripe";

interface SubscriptionInfo {
  id: string;
  status: string;
  trialEnd: string | null;
  trialStart: string | null;
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  canceledAt: string | null;
  planAmount: number | null;
  currency: string | null;
}

interface SubscriptionDashboardProps {
  customerId: string;
}

export function SubscriptionDashboard({
  customerId,
}: SubscriptionDashboardProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    if (!customerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(SUBSCRIPTION_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "get-subscription", customerId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to fetch subscriptions");
      }

      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

    setLoading(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "trialing":
      case "active":
        return "badge badge--success";
      case "past_due":
        return "badge badge--warning";
      case "canceled":
      case "incomplete_expired":
      case "unpaid":
        return "badge badge--error";
      default:
        return "badge";
    }
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return "N/A";
    const symbol = currency.toUpperCase() === "HKD" ? "HK$" : "$";
    return `${symbol}${(amount / 100).toFixed(2)}/day`;
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm("Cancel this subscription? The trial will end immediately."))
      return;

    setCancelling(subscriptionId);
    setError(null);

    try {
      const response = await fetch(SUBSCRIPTION_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cancel-subscription",
          subscriptionId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Failed to cancel subscription");
      }

      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

    setCancelling(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const dateFormatted = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    if (diffDays > 0) {
      return `${dateFormatted} (${diffDays} days from now)`;
    } else if (diffDays === 0) {
      return `${dateFormatted} (today)`;
    } else {
      return `${dateFormatted} (${Math.abs(diffDays)} days ago)`;
    }
  };

  return (
    <div className="card">
      <h2>Subscription Status</h2>
      <p>View your current subscription details from Stripe.</p>

      <div className="customer-id-bar">
        <strong>Customer:</strong> <code>{customerId}</code>
        <button
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(customerId)}
          title="Copy customer ID"
        >
          Copy
        </button>
      </div>

      <button
        onClick={fetchSubscriptions}
        disabled={loading}
        className="pay-button"
      >
        {loading ? "Loading..." : "Refresh from Stripe"}
      </button>

      {error && (
        <div className="status-bar status-bar--error">
          <p className="error-message">{error}</p>
        </div>
      )}

      {subscriptions && subscriptions.length === 0 && (
        <div className="status-bar">
          <p>No subscriptions found for this customer.</p>
          <p className="hint">
            Go to the <strong>Subscribe</strong> tab to start a trial.
          </p>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <div className="subscriptions-list">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="subscription-item">
              <div className="subscription-header">
                <span className={getStatusBadgeClass(sub.status)}>
                  {sub.status}
                </span>
                <span className="subscription-plan">
                  {formatAmount(sub.planAmount, sub.currency)}
                </span>
              </div>
              <div className="subscription-details">
                <p>
                  <strong>ID:</strong> {sub.id}
                </p>
                {sub.trialStart && (
                  <p>
                    <strong>Trial Start:</strong>{" "}
                    {formatDate(sub.trialStart)}
                  </p>
                )}
                {sub.trialEnd && (
                  <p>
                    <strong>Trial End:</strong> {formatDate(sub.trialEnd)}
                  </p>
                )}
                {sub.currentPeriodEnd && sub.status !== "canceled" && (
                  <p>
                    <strong>Current Period End:</strong>{" "}
                    {formatDate(sub.currentPeriodEnd)}
                  </p>
                )}
                {sub.canceledAt && (
                  <p>
                    <strong>Canceled At:</strong>{" "}
                    {formatDate(sub.canceledAt)}
                  </p>
                )}
              </div>
              {(sub.status === "trialing" || sub.status === "active") && (
                <button
                  onClick={() => cancelSubscription(sub.id)}
                  disabled={cancelling === sub.id}
                  className="cancel-button"
                >
                  {cancelling === sub.id ? "Canceling..." : "Cancel Subscription"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card card--info" style={{ marginTop: "1rem" }}>
        <h3>Statuses</h3>
        <ul>
          <li>
            <span className="badge badge--success">trialing</span> — Free
            trial in progress
          </li>
          <li>
            <span className="badge badge--success">active</span> — Billing
            active
          </li>
          <li>
            <span className="badge badge--warning">past_due</span> —
            Payment failed
          </li>
          <li>
            <span className="badge badge--error">canceled</span> — Canceled
          </li>
        </ul>
      </div>
    </div>
  );
}

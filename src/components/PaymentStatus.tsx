interface PaymentStatusProps {
  status: "idle" | "loading" | "success" | "error";
  paymentIntentId?: string;
  errorMessage?: string;
  onReset: () => void;
}

export function PaymentStatus({
  status,
  paymentIntentId,
  errorMessage,
  onReset,
}: PaymentStatusProps) {
  if (status === "idle") return null;

  return (
    <div className={`payment-status payment-status--${status}`}>
      {status === "loading" && (
        <div className="spinner" />
      )}

      {status === "success" && (
        <>
          <div className="status-icon">&#10003;</div>
          <h2>Payment Successful!</h2>
          {paymentIntentId && (
            <p className="payment-id">ID: {paymentIntentId}</p>
          )}
          <button onClick={onReset} className="reset-button">
            Make Another Payment
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="status-icon status-icon--error">&#10007;</div>
          <h2>Payment Failed</h2>
          <p className="error-message">{errorMessage}</p>
          <button onClick={onReset} className="reset-button">
            Try Again
          </button>
        </>
      )}
    </div>
  );
}

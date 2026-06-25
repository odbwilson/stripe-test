import { type FormEvent, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const TIMEOUT_MS = 30000;

export function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe) {
      onError("Stripe not initialized");
      return;
    }
    if (!elements) {
      onError("Card form not loaded yet");
      return;
    }

    setIsProcessing(true);

    const timeout = setTimeout(() => {
      setIsProcessing(false);
      onError("Payment timed out after 30 seconds");
    }, TIMEOUT_MS);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        clearTimeout(timeout);
        onError(submitError.message ?? "Card details invalid");
        setIsProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-complete`,
        },
        redirect: "if_required",
      });

      clearTimeout(timeout);

      if (error) {
        onError(error.message ?? "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent) {
        if (paymentIntent.status === "succeeded") {
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === "requires_action") {
          onError("3D Secure authentication required — check browser");
        } else {
          onError(`Unexpected status: ${paymentIntent.status}`);
        }
      } else {
        onError("No payment intent returned");
      }
    } catch (err) {
      clearTimeout(timeout);
      onError(err instanceof Error ? err.message : "Unexpected error");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="pay-button"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

import { type FormEvent, useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

interface SetupFormProps {
  clientSecret: string;
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
}

export function SetupForm({ clientSecret, onSuccess, onError }: SetupFormProps) {
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

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? "Card details invalid");
        setIsProcessing(false);
        return;
      }

      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/subscribe`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Card setup failed");
        setIsProcessing(false);
        return;
      }

      const pmId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : null;

      if (pmId) {
        onSuccess(pmId);
      } else {
        onError("No payment method returned from Stripe");
      }
    } catch (err) {
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
        {isProcessing ? "Saving..." : "Save Card & Start Trial"}
      </button>
    </form>
  );
}

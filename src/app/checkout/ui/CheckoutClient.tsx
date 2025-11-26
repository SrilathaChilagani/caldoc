"use client";

import { useEffect, useState } from "react";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  name: string;
  theme: { color: string };
  handler: (response: RazorpayHandlerResponse) => void;
  prefill?: {
    name?: string;
    contact?: string;
  };
  modal: { ondismiss: () => void };
};

interface RazorpayInstance {
  open(): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type Props = {
  appointmentId: string;
  amount?: number;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.body.appendChild(script);
  });
}

export default function CheckoutClient({ appointmentId, amount }: Props) {
  const [status, setStatus] = useState<string>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    async function startPayment() {
      try {
        setError(null);
        setStatus("creating-order");
        const res = await fetch("/api/checkout/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId, amount }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Unable to create Razorpay order");
        }

        await loadScript("https://checkout.razorpay.com/v1/checkout.js");

        if (!window.Razorpay) {
          throw new Error("Razorpay SDK unavailable");
        }

        const rzp = new window.Razorpay({
          key: data.key,
          order_id: data.orderId,
          name: "Telemed Checkout",
          theme: { color: "#0f172a" },
          prefill: {
            name: data.prefill?.name,
            contact: data.prefill?.contact,
          },
          handler: async (response: RazorpayHandlerResponse) => {
              try {
                setStatus("confirming");
                const confirmRes = await fetch("/api/checkout/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  appointmentId,
                  ...response,
                }),
              });
              if (!confirmRes.ok) {
                const err = await confirmRes.json();
                throw new Error(err?.error || "Failed to confirm payment");
              }
              setStatus("success");
              window.location.href = `/visit/${appointmentId}`;
            } catch (err) {
              const message = err instanceof Error ? err.message : "Payment confirm failed";
              setStatus("error");
              setError(message);
            }
          },
          modal: {
            ondismiss: () => {
              setStatus("cancelled");
              setError("Payment popup closed. Please try again.");
            },
          },
        });

        setStatus("awaiting-user");
        rzp.open();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Checkout failed";
        setError(message);
        setStatus("error");
      }
    }

    startPayment();
  }, [appointmentId, amount, runKey]);

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <p className="font-medium text-slate-800">Status: {status}</p>
      {error ? (
        <p className="mt-2 text-rose-600">{error}</p>
      ) : (
        <p className="mt-2">A secure Razorpay window should open shortly. Please do not refresh the page.</p>
      )}
      {(status === "error" || status === "cancelled") && (
        <button
          type="button"
          onClick={() => setRunKey((k) => k + 1)}
          className="mt-3 inline-flex items-center rounded-full border border-blue-200 px-4 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300 hover:text-blue-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

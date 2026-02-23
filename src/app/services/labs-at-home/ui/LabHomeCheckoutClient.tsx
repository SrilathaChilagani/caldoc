"use client";

import { useEffect, useState } from "react";
import { clearLabCart } from "./labCart";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open(): void };
  }
}

type RazorpayOptions = {
  key: string;
  order_id: string;
  name: string;
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; contact?: string };
  modal: { ondismiss: () => void };
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type Props = { orderId: string };

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
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export default function LabHomeCheckoutClient({ orderId }: Props) {
  const [status, setStatus] = useState("initializing");
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    async function start() {
      try {
        setStatus("creating-order");
        setError(null);
        const res = await fetch("/api/lab-orders/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to start checkout");

        await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!window.Razorpay) throw new Error("Razorpay SDK unavailable");

        const rzp = new window.Razorpay({
          key: data.key,
          order_id: data.orderId,
          name: "CalDoc Labs",
          theme: { color: "#059669" },
          prefill: data.prefill,
          handler: async (response: RazorpayResponse) => {
            try {
              setStatus("confirming");
              const confirmRes = await fetch("/api/lab-orders/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, ...response }),
              });
              const confirmData = await confirmRes.json().catch(() => ({}));
              if (!confirmRes.ok) throw new Error(confirmData?.error || "Payment confirmation failed");
              setStatus("success");
              clearLabCart();
              window.location.href = `/services/labs-at-home/success?order=${orderId}`;
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Payment error";
              setStatus("error");
              setError(msg);
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
        const msg = err instanceof Error ? err.message : "Checkout failed";
        setError(msg);
        setStatus("error");
      }
    }

    start();
  }, [orderId, runKey]);

  const statusLabel: Record<string, string> = {
    initializing: "Setting up secure checkout…",
    "creating-order": "Creating your order…",
    "awaiting-user": "Please complete payment in the Razorpay window.",
    confirming: "Verifying payment…",
    success: "Payment confirmed! Redirecting…",
    cancelled: "Payment was cancelled.",
    error: "Something went wrong.",
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      <p className="font-medium text-slate-800">{statusLabel[status] ?? status}</p>
      {error && <p className="mt-2 text-rose-600">{error}</p>}
      {!error && status !== "success" && (
        <p className="mt-2">Do not refresh this page while the payment window is open.</p>
      )}
      {(status === "error" || status === "cancelled") && (
        <button
          type="button"
          onClick={() => setRunKey((k) => k + 1)}
          className="mt-3 inline-flex items-center rounded-full border border-emerald-200 px-4 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

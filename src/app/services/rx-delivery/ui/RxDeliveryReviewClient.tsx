"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { formatINR } from "@/lib/format";
import { RX_DELIVERY_UNIT_PRICE_PAISE } from "@/lib/rxDeliveryPricing";
import RxDeliveryForm from "./RxDeliveryForm";
import { loadRxCart, saveRxCart, type RxCartItem } from "./rxCart";

type MedicationOption = {
  name: string;
  category?: string | null;
};

type Props = {
  options: MedicationOption[];
};

export default function RxDeliveryReviewClient({ options }: Props) {
  const [cart, setCart] = useState<RxCartItem[]>([]);

  useEffect(() => {
    setCart(loadRxCart());
  }, []);

  const removeItem = (name: string) => {
    const normalized = name.toLowerCase();
    setCart((prev) => {
      const next = prev.filter((item) => item.name.toLowerCase() !== normalized);
      saveRxCart(next);
      return next;
    });
  };

  const summary = useMemo(() => {
    const items = cart.map((item) => ({
      ...item,
      qty: Math.max(1, Number(item.qty) || 1),
      lineTotal: Math.max(1, Number(item.qty) || 1) * RX_DELIVERY_UNIT_PRICE_PAISE,
    }));
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return { items, total };
  }, [cart]);

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f2ea] text-slate-900">
        <div className="container mx-auto px-6 lg:px-12 py-20">
          <BackButton />
          <div className="mt-8 rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <h1 className="font-serif text-3xl text-slate-900">Your order is empty</h1>
            <p className="mt-3 text-sm text-slate-600">
              Add medicines from the search page to review your order.
            </p>
            <Link
              href="/services/rx-delivery/search"
              className="mt-6 inline-flex rounded-full bg-[#2f6ea5] px-6 py-2 text-sm font-semibold text-white"
            >
              Go to search
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-slate-900">
      <div className="container mx-auto px-6 lg:px-12 py-16">
        <BackButton />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <h1 className="font-serif text-3xl text-slate-900">Review your order</h1>
            <p className="mt-2 text-sm text-slate-600">
              Confirm quantities and totals before proceeding to payment.
            </p>

            <div className="mt-6 space-y-4">
              {summary.items.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">Qty {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{formatINR(item.lineTotal)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.name)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#e7e0d5] pt-4 text-sm">
              <span className="text-slate-600">Total</span>
              <span className="text-lg font-semibold text-slate-900">{formatINR(summary.total)}</span>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
            <h2 className="font-serif text-xl text-slate-900">Delivery details</h2>
            <p className="mt-2 text-sm text-slate-600">
              Provide contact details and proceed to payment.
            </p>
            <div className="mt-6">
              <RxDeliveryForm
                options={options}
                initialItems={cart.map((item) => ({ name: item.name, qty: item.qty }))}
                showItemsSection={false}
                key={cart.map((item) => `${item.name}:${item.qty}`).join("|")}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

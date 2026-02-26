"use client";

import { useEffect, useMemo, useState } from "react";
import { loadRxCart, saveRxCart, type RxCartItem } from "./rxCart";

type PopularMed = {
  name: string;
  category: string;
};

type Props = {
  meds: PopularMed[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export default function RxPopularMeds({ meds }: Props) {
  const [cart, setCart] = useState<RxCartItem[]>([]);
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [draftVisible, setDraftVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCart(loadRxCart());
  }, []);

  useEffect(() => {
    saveRxCart(cart);
  }, [cart]);

  const cartMap = useMemo(() => {
    const map = new Map<string, RxCartItem>();
    for (const item of cart) {
      map.set(normalizeName(item.name), item);
    }
    return map;
  }, [cart]);

  const updateCartItem = (med: PopularMed, qty: number) => {
    const normalized = normalizeName(med.name);
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => normalizeName(item.name) !== normalized));
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      const idx = next.findIndex((item) => normalizeName(item.name) === normalized);
      if (idx >= 0) {
        next[idx] = { ...next[idx], qty };
      } else {
        next.push({ name: med.name, qty });
      }
      return next;
    });
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {meds.map((med) => {
        const cartItem = cartMap.get(normalizeName(med.name));
        const isDraft = draftVisible[normalizeName(med.name)] && !cartItem;
        return (
          <div
            key={med.name}
            className="rounded-2xl border border-white/40 bg-white/70 p-5 flex flex-col gap-4 justify-between hover:shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition-all duration-300"
          >
            <div>
              <h3 className="font-medium text-slate-900">{med.name}</h3>
              <p className="text-xs text-slate-600">{med.category}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">₹199 / item</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {cartItem ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white px-2 py-1 text-sm text-slate-700">
                    <button
                      type="button"
                      onClick={() => updateCartItem(med, Math.max(1, cartItem.qty - 1))}
                      className="h-7 w-7 rounded-full border border-[#e7e0d5] text-slate-600 hover:bg-[#f6f1e9]"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={cartItem.qty}
                      onChange={(e) => updateCartItem(med, Number(e.target.value) || 1)}
                      className="w-12 bg-transparent text-center text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateCartItem(med, cartItem.qty + 1)}
                      className="h-7 w-7 rounded-full border border-[#e7e0d5] text-slate-600 hover:bg-[#f6f1e9]"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="rounded-full bg-[#2f6ea5]/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]"
                  >
                    Added
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartItem(med, 0)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </>
              ) : isDraft ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white px-2 py-1 text-sm text-slate-700">
                    <span className="text-xs text-slate-500">Qty</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={draftQty[normalizeName(med.name)] ?? 1}
                      onChange={(e) => {
                        const next = Math.max(1, Number(e.target.value) || 1);
                        setDraftQty((prev) => ({ ...prev, [normalizeName(med.name)]: next }));
                      }}
                      className="w-12 bg-transparent text-center text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateCartItem(med, draftQty[normalizeName(med.name)] ?? 1);
                      setDraftVisible((prev) => ({ ...prev, [normalizeName(med.name)]: false }));
                    }}
                    className="rounded-xl bg-[#2f6ea5] hover:bg-[#255b8b] text-white text-sm px-4 py-2"
                  >
                    Add to order
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftVisible((prev) => ({ ...prev, [normalizeName(med.name)]: true }));
                    setDraftQty((prev) => ({ ...prev, [normalizeName(med.name)]: prev[normalizeName(med.name)] ?? 1 }));
                  }}
                  className="rounded-xl bg-[#2f6ea5] hover:bg-[#255b8b] text-white text-sm px-4 py-2"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

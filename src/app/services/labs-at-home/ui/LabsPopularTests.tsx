"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLabCart, saveLabCart, type LabCartItem } from "./labCart";

type PopularTest = {
  name: string;
  category: string;
};

type Props = {
  tests: PopularTest[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export default function LabsPopularTests({ tests }: Props) {
  const [cart, setCart] = useState<LabCartItem[]>([]);
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [draftVisible, setDraftVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCart(loadLabCart());
  }, []);

  useEffect(() => {
    saveLabCart(cart);
  }, [cart]);

  const cartMap = useMemo(() => {
    const map = new Map<string, LabCartItem>();
    for (const item of cart) {
      map.set(normalizeName(item.name), item);
    }
    return map;
  }, [cart]);

  const updateCartItem = (name: string, qty: number) => {
    const normalized = normalizeName(name);
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
        next.push({ name, qty });
      }
      return next;
    });
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
      {tests.map((test) => {
        const cartItem = cartMap.get(normalizeName(test.name));
        const isDraft = draftVisible[normalizeName(test.name)] && !cartItem;
        return (
          <div
            key={test.name}
            className="rounded-2xl border border-white/40 bg-white/70 p-5 flex flex-col gap-4 justify-between hover:shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] transition-all duration-300"
          >
            <div>
              <h3 className="font-medium text-slate-900">{test.name}</h3>
              <p className="text-xs text-slate-600">{test.category}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">₹799 / test</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {cartItem ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white px-2 py-1 text-sm text-slate-700">
                    <button
                      type="button"
                      onClick={() => updateCartItem(test.name, Math.max(1, cartItem.qty - 1))}
                      className="h-7 w-7 rounded-full border border-[#e7e0d5] text-slate-600 hover:bg-[#f6f1e9]"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={cartItem.qty}
                      onChange={(e) => updateCartItem(test.name, Number(e.target.value) || 1)}
                      className="w-12 bg-transparent text-center text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateCartItem(test.name, cartItem.qty + 1)}
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
                    onClick={() => updateCartItem(test.name, 0)}
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
                      value={draftQty[normalizeName(test.name)] ?? 1}
                      onChange={(e) => {
                        const next = Math.max(1, Number(e.target.value) || 1);
                        setDraftQty((prev) => ({ ...prev, [normalizeName(test.name)]: next }));
                      }}
                      className="w-12 bg-transparent text-center text-sm outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateCartItem(test.name, draftQty[normalizeName(test.name)] ?? 1);
                      setDraftVisible((prev) => ({ ...prev, [normalizeName(test.name)]: false }));
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
                    setDraftVisible((prev) => ({ ...prev, [normalizeName(test.name)]: true }));
                    setDraftQty((prev) => ({ ...prev, [normalizeName(test.name)]: prev[normalizeName(test.name)] ?? 1 }));
                  }}
                  className="rounded-xl bg-[#2f6ea5] hover:bg-[#255b8b] text-white text-sm px-4 py-2"
                >
                  Book
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

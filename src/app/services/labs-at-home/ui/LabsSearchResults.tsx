"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadLabCart, saveLabCart, type LabCartItem } from "./labCart";

type Props = {
  tests: string[];
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export default function LabsSearchResults({ tests }: Props) {
  const router = useRouter();
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

  const totalItems = cart.reduce((sum, item) => sum + Math.max(1, item.qty || 0), 0);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          {totalItems > 0 ? `${totalItems} test${totalItems === 1 ? "" : "s"} added` : "No tests added yet"}
        </div>
        <button
          type="button"
          onClick={() => router.push("/services/labs-at-home/review")}
          disabled={cart.length === 0}
          className="rounded-full bg-[#2f6ea5] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          Review Order
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="py-8 text-sm text-slate-500">
          No tests found. Try another name or keyword.
        </div>
      ) : (
        <div className="divide-y divide-[#e7e0d5]">
          {tests.map((test) => {
            const cartItem = cartMap.get(normalizeName(test));
            const isDraft = draftVisible[normalizeName(test)] && !cartItem;
            return (
              <div key={test} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{test}</p>
                  <p className="text-xs text-slate-500">Home collection available</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {cartItem ? (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e0d5] bg-white px-2 py-1 text-sm text-slate-700">
                        <button
                          type="button"
                          onClick={() => updateCartItem(test, Math.max(1, cartItem.qty - 1))}
                          className="h-7 w-7 rounded-full border border-[#e7e0d5] text-slate-600 hover:bg-[#f6f1e9]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={cartItem.qty}
                          onChange={(e) => updateCartItem(test, Number(e.target.value) || 1)}
                          className="w-12 bg-transparent text-center text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartItem(test, cartItem.qty + 1)}
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
                        onClick={() => updateCartItem(test, 0)}
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
                          value={draftQty[normalizeName(test)] ?? 1}
                          onChange={(e) => {
                            const next = Math.max(1, Number(e.target.value) || 1);
                            setDraftQty((prev) => ({ ...prev, [normalizeName(test)]: next }));
                          }}
                          className="w-12 bg-transparent text-center text-sm outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateCartItem(test, draftQty[normalizeName(test)] ?? 1);
                          setDraftVisible((prev) => ({ ...prev, [normalizeName(test)]: false }));
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#2f6ea5] px-5 text-sm font-medium text-white hover:bg-[#255b8b]"
                      >
                        Add to order
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const key = normalizeName(test);
                        setDraftVisible((prev) => ({ ...prev, [key]: true }));
                        setDraftQty((prev) => ({ ...prev, [key]: prev[key] ?? 1 }));
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2f6ea5] px-5 text-sm font-medium text-white hover:bg-[#255b8b]"
                    >
                      Add to order
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

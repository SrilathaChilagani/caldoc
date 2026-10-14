// Drug category types and helpers.
// Source of truth for category definitions: src/config/drugCategories.ts
export type { DrugCategory } from "@/config/drugCategories";
export { DRUG_CATEGORY_VALUES } from "@/config/drugCategories";

export type Medicine = {
  name: string;
  sig?: string;
  qty?: string;
  category: import("@/config/drugCategories").DrugCategory;
};

import { DRUG_CATEGORY_VALUES } from "@/config/drugCategories";
import type { DrugCategory } from "@/config/drugCategories";

export function isDrugCategory(value: unknown): value is DrugCategory {
  return (
    typeof value === "string" &&
    (DRUG_CATEGORY_VALUES as readonly string[]).includes(value.trim().toUpperCase())
  );
}

export function normalizeDrugCategory(value?: string | null): DrugCategory {
  if (!value) return "OTC";
  const normalized = value.trim().toUpperCase();
  return isDrugCategory(normalized) ? (normalized as DrugCategory) : "OTC";
}

export function defaultMedicineRow(): Medicine {
  return { name: "", sig: "", qty: "", category: "OTC" };
}

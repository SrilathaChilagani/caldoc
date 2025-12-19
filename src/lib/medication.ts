const DRUG_CATEGORY_VALUES = ["OTC", "LIST_O", "LIST_A", "LIST_B", "SCHEDULE_X"] as const;

export type DrugCategory = (typeof DRUG_CATEGORY_VALUES)[number];

export type Medicine = {
  name: string;
  sig?: string;
  qty?: string;
  category: DrugCategory;
};

export function isDrugCategory(value: unknown): value is DrugCategory {
  return (
    typeof value === "string" &&
    DRUG_CATEGORY_VALUES.includes(value.trim().toUpperCase() as DrugCategory)
  );
}

export function normalizeDrugCategory(value?: string | null): DrugCategory {
  if (!value) {
    return "OTC";
  }
  const normalized = value.trim().toUpperCase();
  return isDrugCategory(normalized) ? (normalized as DrugCategory) : "OTC";
}

export function defaultMedicineRow(): Medicine {
  return { name: "", sig: "", qty: "", category: "OTC" };
}

export { DRUG_CATEGORY_VALUES };

import { findTestByName } from "./labCatalog";

export const LABS_HOME_TEST_PAISE = Number(process.env.LABS_HOME_TEST_PAISE || 79900);

export function computeLabAmount(items: Array<{ name: string; qty?: number }>): number {
  if (!items.length) return 0;
  return items.reduce((sum, item) => {
    const entry = findTestByName(item.name);
    const price = entry?.pricePaise ?? LABS_HOME_TEST_PAISE;
    return sum + Math.max(1, Number(item.qty) || 1) * price;
  }, 0);
}

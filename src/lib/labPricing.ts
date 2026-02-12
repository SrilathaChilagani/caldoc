type LabItem = { qty: number };

export const LABS_HOME_TEST_PAISE = Number(process.env.LABS_HOME_TEST_PAISE || 79900);

export function computeLabAmount(items: LabItem[]) {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 0) * LABS_HOME_TEST_PAISE, 0);
}

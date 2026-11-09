/** Category labels are editable; cross-service meal identifiers are not. */
export function categoryMealPeriod(name?: string): string | null {
  const words = (name ?? '').toUpperCase().split(/[^A-Z]+/);
  const periods = ['BREAKFAST', 'LUNCH', 'DINNER'].filter((period) =>
    words.includes(period),
  );
  if (words.includes('TEA')) periods.push('TEA_TIME');
  // Unknown or mixed labels must never become invalid food_order_meal_period values.
  return periods.length === 1 ? periods[0]! : null;
}

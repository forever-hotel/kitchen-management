/** Mirrors R-05's same-day ordering-window policy; the backend remains authoritative. */
export interface CreateCategoryInput {
  name: string;
  orderStartTime: string;
  orderCutoffTime: string;
}

export function normalizeCategoryTime(value: string): string | null {
  const normalized = value.trim();

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(normalized);

  if (!match) return null;

  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
}

export function validateCreateCategory(values: CreateCategoryInput): string | null {
  if (!values.name.trim()) return 'Category name is required.';
  if (values.name.trim().length > 100) return 'Category name must be 100 characters or fewer.';
  const start = normalizeCategoryTime(values.orderStartTime);
  const cutoff = normalizeCategoryTime(values.orderCutoffTime);
  if (!start || !cutoff) return 'Enter valid 24-hour times (HH:mm or HH:mm:ss).';
  if (cutoff <= start) return 'Cutoff time must be after start time on the same day.';
  return null;
}

export function normalizeCreateCategory(values: CreateCategoryInput): CreateCategoryInput {
  const error = validateCreateCategory(values);
  if (error) throw new Error(error);
  return {
    name: values.name.trim(),
    orderStartTime: normalizeCategoryTime(values.orderStartTime)!,
    orderCutoffTime: normalizeCategoryTime(values.orderCutoffTime)!,
  };
}

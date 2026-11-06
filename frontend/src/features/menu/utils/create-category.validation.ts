/** Mirrors R-05's same-day ordering-window policy; the backend remains authoritative. */
export interface CreateCategoryInput {
  name: string;
  orderStartTime: string;
  orderCutoffTime: string;
}

export function normalizeCategoryTime(value: string): string | null {
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const [hour, minute, second = 0] = value.split(':').map(Number);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
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

export function nowIso(): string {
  return new Date().toISOString();
}

/** Converts Firestore Timestamps, Dates and ISO strings into ISO strings. */
export function toIsoString(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === 'function') {
      const date = (toDate as () => Date).call(value);
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date.toISOString()
        : null;
    }
  }

  return null;
}

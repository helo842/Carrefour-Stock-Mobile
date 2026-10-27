import type { DocumentData } from 'firebase-admin/firestore';

export function readString(data: DocumentData, key: string, fallback = ''): string {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

export function readNullableString(data: DocumentData, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function readNumber(data: DocumentData, key: string, fallback = 0): number {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('es-ES').format(quantity);
}

export function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return 'Sin actualizar';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin actualizar';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

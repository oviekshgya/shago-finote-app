export function formatDate(timestamp: number): string {
  if (!timestamp || Number.isNaN(timestamp)) {
    return '-';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

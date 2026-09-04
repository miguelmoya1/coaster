export function formatCents(valueInCents: number, locale: string, currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(valueInCents / 100);
}

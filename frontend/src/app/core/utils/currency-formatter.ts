export function convertCurrency(
  amountEur: number,
  exchangeRate: number = 1.0
): number {
  return amountEur * exchangeRate;
}

export function formatCurrency(
  amount: number,
  currencyCode: string = 'EUR',
  locale: string = 'es-ES'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}


import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from '../../core/utils/currency-formatter';

@Pipe({
  name: 'currencyConvert',
  standalone: true,
})
export class CurrencyConvertPipe implements PipeTransform {
  transform(
    amountEur: number | null | undefined,
    currencyCode: string = 'EUR',
    exchangeRate: number = 1.0,
    locale: string = 'es-ES'
  ): string {
    if (amountEur === null || amountEur === undefined) {
      return '-';
    }
    const converted = amountEur * exchangeRate;
    return formatCurrency(converted, currencyCode, locale);
  }
}


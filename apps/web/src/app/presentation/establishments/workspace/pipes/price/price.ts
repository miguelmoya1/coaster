import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'price',
  standalone: true,
})
export class PricePipe implements PipeTransform {
  transform(valueInCents: number | undefined | null, currency = 'EUR'): string {
    if (valueInCents == null) return '0,00 €';

    const value = valueInCents / 100;

    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency,
    }).format(value);
  }
}

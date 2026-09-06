import { inject, Pipe, PipeTransform } from '@angular/core';
import { MoneyFormatterService } from '@coaster/core';

@Pipe({
  name: 'price',
  standalone: true,
})
export class PricePipe implements PipeTransform {
  readonly #money = inject(MoneyFormatterService);

  transform(valueInCents: number | undefined | null, currency = 'EUR'): string {
    if (valueInCents == null) return '0,00 €';

    return this.#money.format(valueInCents, currency);
  }
}

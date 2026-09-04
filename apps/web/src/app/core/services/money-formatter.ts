import { inject, Service } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatCents } from '../utils/money.utils';

const LOCALES: Record<string, string> = { es: 'es-ES', en: 'en-GB' };

@Service()
export class MoneyFormatterService {
  readonly #translate = inject(TranslateService, { optional: true });

  get #locale(): string {
    return LOCALES[this.#translate?.getCurrentLang() ?? ''] ?? LOCALES['es'];
  }

  public format(valueInCents: number, currency = 'EUR'): string {
    return formatCents(valueInCents, this.#locale, currency);
  }
}

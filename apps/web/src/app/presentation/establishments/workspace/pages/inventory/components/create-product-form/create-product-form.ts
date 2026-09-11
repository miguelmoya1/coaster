import { Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, max, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import type { Category, CreateProductDto } from '@coaster/common';
import { ALLERGENS, asCategoryId, DEFAULT_TAX_RATE, grossFromNet, toBasisPoints } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChipSelect } from '../../../../../../components/chip-select/chip-select';
import { Field } from '../../../../../../components/field/field';
import { FormErrors } from '../../../../../../components/field/form-errors';
import { CoasterInput } from '../../../../../../components/field/input.directive';
import { IconPicker } from '../../../../../../components/icon-picker/icon-picker';
import { NumberInput } from '../../../../../../components/number-input/number-input';
import { PricePipe } from '../../../../pipes/price/price';

@Component({
  selector: 'coaster-create-product-form',
  imports: [
    IconPicker,
    PricePipe,
    FormRoot,
    NumberInput,
    ChipSelect,
    FormField,
    MatButton,
    TranslatePipe,
    Field,
    CoasterInput,
    FormErrors,
  ],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-field [label]="'inventory.create_product.name_label' | translate">
          <input
            coasterInput
            data-testid="product-name-input"
            enterkeyhint="next"
            [formField]="form.name"
            [placeholder]="'inventory.create_product.name_placeholder' | translate"
          />
        </coaster-field>

        <coaster-field [label]="'inventory.create_product.category_label' | translate">
          <select coasterInput [formField]="form.categoryId">
            <option value="" disabled>{{ 'inventory.create_product.category_placeholder' | translate }}</option>
            @for (option of categoryOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </coaster-field>

        <coaster-field [label]="'inventory.create_product.image_url_label' | translate">
          <input coasterInput [formField]="form.imageUrl" placeholder="https://..." />
        </coaster-field>

        <coaster-field
          [label]="'inventory.product_tax_rate_label' | translate"
          [hint]="'inventory.product_tax_rate_hint' | translate"
        >
          <input coasterInput type="number" step="0.5" [formField]="form.taxRatePercent" />
        </coaster-field>

        <div class="flex items-baseline justify-between rounded-lg bg-surface-container-highest px-3 py-2 text-sm">
          <span class="text-on-surface-variant">{{ 'inventory.gross_price_label' | translate }}</span>
          <span class="font-bold text-on-surface">{{ grossPreview() | price }}</span>
        </div>

        <coaster-icon-picker
          [formField]="form.icon"
          [label]="'inventory.icon_label' | translate"
          [placeholder]="'inventory.icon_none' | translate"
        />

        <coaster-chip-select
          [formField]="form.allergens"
          [options]="allergenOptions()"
          [label]="'inventory.allergens_label' | translate"
          [hint]="'inventory.allergens_hint' | translate"
        />

        <coaster-number-input
          data-testid="product-price-input"
          [formField]="form.price"
          [label]="'Precio (Céntimos)'"
        />

        <coaster-number-input
          [formField]="form.currentStock"
          [label]="'inventory.create_product.current_stock_label' | translate"
        />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'inventory.create_product.min_stock_label' | translate"
        />

        <coaster-form-errors [errors]="form().errors()" />

        <div class="flex justify-end mt-4 gap-2">
          <button
            mat-stroked-button
            class="w-full"
            type="button"
            [disabled]="form().submitting()"
            (click)="handleCancel()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            data-testid="submit-btn"
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().disabled() || form().submitting() || form().invalid()"
          >
            {{ 'common.create' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CreateProductForm {
  readonly categories = input.required<Category[]>();
  readonly #productsStore = inject(ProductsStore);
  readonly #translate = inject(TranslateService);
  readonly establishmentId = this.#productsStore.currentEstablishmentId;

  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  });

  protected readonly allergenOptions = computed(() =>
    ALLERGENS.map((allergen) => ({ value: allergen, label: this.#translate.instant(`allergens.${allergen}`) })),
  );

  readonly #formBase = signal<Omit<Required<CreateProductDto>, 'ownTaxRate'> & { taxRatePercent: number | null }>({
    name: '',
    categoryId: asCategoryId(''),
    price: 0,
    currentStock: 0,
    minStockAlert: 5,
    imageUrl: '',
    allergens: [],
    icon: '',
    taxRatePercent: null,
  });

  protected readonly effectiveTaxRate = computed(() => {
    const own = this.form.taxRatePercent().value();

    if (own !== null) {
      return toBasisPoints(own);
    }

    const categoryId = this.form.categoryId().value();

    return this.categories().find((category) => category.id === categoryId)?.taxRate ?? DEFAULT_TAX_RATE;
  });

  protected readonly grossPreview = computed(() =>
    grossFromNet(this.form.price().value() || 0, this.effectiveTaxRate()),
  );

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

      min(fields.taxRatePercent, 0);
      max(fields.taxRatePercent, 100);

      required(fields.categoryId);

      min(fields.price, 0);

      required(fields.currentStock);
      min(fields.currentStock, 0);

      required(fields.minStockAlert);
      min(fields.minStockAlert, 0);
    },
    {
      submission: {
        action: async (form) => {
          const { taxRatePercent, ...rest } = form().value();
          const payload: CreateProductDto = {
            ...rest,
            ownTaxRate: taxRatePercent === null ? null : toBasisPoints(taxRatePercent),
          };

          try {
            await this.#productsStore.create(payload);
            this.created.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected handleCancel() {
    this.canceled.emit();
  }
}

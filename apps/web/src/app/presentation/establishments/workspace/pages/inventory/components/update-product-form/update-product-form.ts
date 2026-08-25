import { ALLERGENS, asCategoryId, DEFAULT_TAX_RATE, grossFromNet, toBasisPoints, toPercentage } from '@coaster/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, max, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import type { Category, UpdateProductDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChipSelect } from '../../../../../../components/chip-select/chip-select';
import { NumberInput } from '../../../../../../components/number-input/number-input';
import { PricePipe } from '../../../../pipes/price/price';
import { Field } from '../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../components/field/input.directive';
import { IconPicker } from '../../../../../../components/icon-picker/icon-picker';

@Component({
  selector: 'coaster-edit-product-form',
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
  ],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-field [label]="'inventory.edit_product.name_label' | translate">
          <input
            coasterInput
            enterkeyhint="next"
            [formField]="form.name"
            [placeholder]="'inventory.edit_product.name_placeholder' | translate"
          />
        </coaster-field>

        <coaster-field [label]="'inventory.edit_product.category_label' | translate">
          <select coasterInput [formField]="form.categoryId">
            <option value="" disabled>{{ 'inventory.edit_product.category_placeholder' | translate }}</option>
            @for (option of categoryOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </coaster-field>

        <coaster-field [label]="'inventory.edit_product.image_url_label' | translate">
          <input coasterInput [formField]="form.imageUrl" placeholder="https://..." />
        </coaster-field>

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'inventory.edit_product.min_stock_label' | translate"
        />

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

        @if (form().errors().length > 0) {
          <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
            @for (error of form().errors(); track error) {
              <span class="text-error text-xs font-medium">{{ error.message || error.kind | translate: error }}</span>
            }
          </div>
        }

        <div class="flex justify-end mt-4 gap-2">
          <button
            mat-stroked-button
            class="w-full"
            type="button"
            [disabled]="form().disabled() || form().submitting()"
            (click)="canceled.emit()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button mat-flat-button class="w-full" type="submit" [disabled]="form().disabled() || form().submitting()">
            {{ 'common.update' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class UpdateProductForm {
  public readonly product = input.required<Product>();
  public readonly categories = input.required<Category[]>();

  public readonly canceled = output<void>();
  public readonly edited = output<void>();

  readonly #productStore = inject(ProductsStore);
  readonly #translate = inject(TranslateService);
  readonly establishmentId = this.#productStore.currentEstablishmentId;

  protected readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  });

  protected readonly allergenOptions = computed(() =>
    ALLERGENS.map((allergen) => ({ value: allergen, label: this.#translate.instant(`allergens.${allergen}`) })),
  );

  readonly #productModel = signal<Omit<Required<UpdateProductDto>, 'ownTaxRate'> & { taxRatePercent: number | null }>({
    categoryId: asCategoryId(''),
    price: 0,
    minStockAlert: 0,
    name: '',
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
    this.#productModel,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

      min(fields.taxRatePercent, 0);
      max(fields.taxRatePercent, 100);

      required(fields.categoryId);

      min(fields.price, 0);

      required(fields.minStockAlert);
      min(fields.minStockAlert, 0);
    },
    {
      submission: {
        action: async (form) => {
          const { taxRatePercent, ...rest } = form().value();
          const payload: UpdateProductDto = {
            ...rest,
            ownTaxRate: taxRatePercent === null ? null : toBasisPoints(taxRatePercent),
          };

          try {
            await this.#productStore.update(this.product().id, payload);
            this.edited.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  constructor() {
    effect(() => {
      const product = this.product();
      if (product) {
        this.#productModel.set({
          name: product.name,
          categoryId: product.categoryId,
          price: product.price ?? 0,
          minStockAlert: product.minStockAlert,
          imageUrl: product.imageUrl ?? '',
          allergens: [...(product.allergens ?? [])],
          icon: product.icon ?? '',
          taxRatePercent: product.ownTaxRate === undefined ? null : toPercentage(product.ownTaxRate),
        });
      }
    });
  }
}

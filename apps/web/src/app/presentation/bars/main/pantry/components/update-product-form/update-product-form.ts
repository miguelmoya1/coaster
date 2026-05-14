import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, min, minLength, required } from '@angular/forms/signals';
import { asCategoryId, Category, Product, UpdateProductDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ProductsStore } from '../../../../../../products';
import { CoasterBtn, FormFieldMessages, NumberInput, SelectInput, TextInput } from '../../../../../../shared';

@Component({
  selector: 'coaster-edit-product-form',
  imports: [FormRoot, TextInput, NumberInput, SelectInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-text-input
          [formField]="form.name"
          [label]="'pantry.edit_product.name_label' | translate"
          [placeholder]="'pantry.edit_product.name_placeholder' | translate"
        />

        <coaster-select-input
          [formField]="form.categoryId"
          [label]="'pantry.edit_product.category_label' | translate"
          [options]="categoryOptions()"
          [placeholder]="'pantry.edit_product.category_placeholder' | translate"
        />

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" showControls />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'pantry.edit_product.min_stock_label' | translate"
          showControls
        />

        @if (form().errors().length > 0) {
          <coaster-form-field-messages [invalid]="true" [errors]="form().errors()" />
        }

        <div class="flex justify-end mt-4 gap-2">
          <button
            coaster-btn
            class="w-full"
            type="button"
            variant="outline"
            [disabled]="form().disabled() || form().submitting()"
            (click)="canceled.emit()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            coaster-btn
            class="w-full"
            type="submit"
            variant="primary"
            [disabled]="form().disabled() || form().submitting()"
          >
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

  protected readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  });

  readonly #productModel = signal<Required<UpdateProductDto>>({
    categoryId: asCategoryId(''),
    price: 0,
    minStockAlert: 0,
    name: '',
  });

  protected readonly form = form(
    this.#productModel,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

      required(fields.categoryId);

      min(fields.price, 0);

      required(fields.minStockAlert);
      min(fields.minStockAlert, 0);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();
          const error = await this.#productStore.update(this.product().id, payload);

          if (!error) {
            this.edited.emit();
          }

          return error;
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
        });
      }
    });
  }
}

import { Component, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { Product } from '@coaster/common';
import { ProductsStore } from '@coaster/products';
import { CoasterBtn, CoasterTitle, FormFieldMessages, NumberInput } from '@coaster/shared';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-update-product-form',
  imports: [FormRoot, NumberInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages, CoasterTitle],
  template: `
    <div class="px-6 pb-6 pt-6">
      <h2 coaster-title class="mb-6">{{ product().name }}</h2>
      <form [formRoot]="form">
        <div class="flex flex-col gap-4">
          <coaster-number-input
            [formField]="form.currentStock"
            [label]="'pantry.update_product.current_stock_label' | translate"
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
              (click)="handleCancel()"
            >
              {{ 'common.cancel' | translate }}
            </button>

            <button
              coaster-btn
              class="w-full"
              type="submit"
              variant="primary"
              [disabled]="form().disabled() || form().submitting() || form().invalid()"
            >
              {{ 'common.update' | translate }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class UpdateStockProductForm {
  public readonly product = input.required<Product>();

  public readonly canceled = output<void>();
  public readonly updated = output<void>();

  readonly #productStore = inject(ProductsStore);

  readonly #formBase = signal<{ currentStock: number }>({
    currentStock: 0,
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.currentStock);
      min(fields.currentStock, 0);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();

          const error = await this.#productStore.updateStock(this.product().id, payload);

          if (!error) {
            this.updated.emit();
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
        this.#formBase.set({
          currentStock: product.currentStock,
        });
      }
    });
  }

  protected handleCancel() {
    this.canceled.emit();
  }
}

import { Component, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { FormFieldMessages } from '../../../../../../components/forms/form-field-messages/form-field-messages';
import { NumberInput } from '../../../../../../components/forms/number-input/number-input';
import { CoasterTitle } from '../../../../../../components/typography/typography';

@Component({
  selector: 'coaster-update-product-form',
  imports: [FormRoot, NumberInput, FormField, MatButton, TranslatePipe, FormFieldMessages, CoasterTitle],
  template: `
    <div class="px-6 pb-6 pt-6">
      <h2 coaster-title class="mb-6">{{ product().name | translate }}</h2>
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
              mat-stroked-button
              class="h-16 w-full"
              type="button"
              [disabled]="form().disabled() || form().submitting()"
              (click)="handleCancel()"
            >
              {{ 'common.cancel' | translate }}
            </button>

            <button
              mat-flat-button
              class="h-16 w-full"
              type="submit"
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

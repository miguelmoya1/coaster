import { Component, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { handleErrorFormField } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { FormErrors } from '../../../../../../components/field/form-errors';
import { NumberInput } from '../../../../../../components/number-input/number-input';

@Component({
  selector: 'coaster-update-product-form',
  imports: [FormRoot, NumberInput, FormField, MatButton, TranslatePipe, FormErrors],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <div>
      <h2 class="heading-2 mb-6">{{ product().name }}</h2>
      <form [formRoot]="form">
        <div class="flex flex-col gap-4">
          <coaster-number-input
            [formField]="form.currentStock"
            [label]="'inventory.update_product.current_stock_label' | translate"
          />

          <coaster-form-errors [errors]="form().errors()" />

          <div class="flex justify-end mt-4 gap-2">
            <button
              mat-stroked-button
              class="w-full"
              type="button"
              [disabled]="form().disabled() || form().submitting()"
              (click)="handleCancel()"
            >
              {{ 'common.cancel' | translate }}
            </button>

            <button
              mat-flat-button
              class="w-full"
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

          try {
            await this.#productStore.updateStock(this.product().id, payload);
            this.updated.emit();
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

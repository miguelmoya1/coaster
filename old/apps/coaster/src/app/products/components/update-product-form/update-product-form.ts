import { Component, effect, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required, TreeValidationResult } from '@angular/forms/signals';
import { Product, UpdateProductStockDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, CoasterTitle, FormFieldMessages, NumberInput } from '../../../shared';

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
              [disabled]="disabled()"
              (click)="canceled.emit()"
            >
              {{ 'common.cancel' | translate }}
            </button>

            <button
              coaster-btn
              class="w-full"
              type="submit"
              variant="primary"
              [disabled]="form().invalid() || disabled()"
            >
              {{ 'common.update' | translate }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class UpdateProductForm {
  readonly product = input.required<Product>();
  readonly disabled = input(false);
  readonly submitAction = input.required<(payload: UpdateProductStockDto) => Promise<TreeValidationResult>>();

  readonly canceled = output<void>();

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
          const action = this.submitAction();

          return await action(payload);
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
}

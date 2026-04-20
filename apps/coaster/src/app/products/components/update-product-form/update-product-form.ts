import { Component, effect, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { Product, UpdateProductStockDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, FormFieldMessages, NumberInput } from '../../../shared';

@Component({
  selector: 'coaster-update-product-form',
  imports: [FormRoot, NumberInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
    <div class="px-6 pb-6 pt-6">
      <h2 class="text-xl font-bold mb-4 text-on-surface">
        {{ 'pantry.update_stock' | translate }} - {{ product().name }}
      </h2>
      <form [formRoot]="form">
        <div class="flex flex-col gap-4">
          <coaster-number-input
            [formField]="form.currentStock"
            [label]="'pantry.create_product.current_stock_label' | translate"
            showControls
          />

          @if (error(); as err) {
            <coaster-form-field-messages [invalid]="true" [errors]="[{ message: err | translate, kind: '' }]" />
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
              {{ 'pantry.create_product.cancel_btn' | translate }}
            </button>

            <button coaster-btn class="w-full" type="submit" variant="primary" [disabled]="disabled()">
              Guardar Stock
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class UpdateProductForm {
  public readonly product = input.required<Product>();

  public readonly updateStock = output<UpdateProductStockDto>();
  public readonly canceled = output<void>();

  public readonly disabled = input(false);
  public readonly error = input<string | undefined>();

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
          this.updateStock.emit(payload);
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

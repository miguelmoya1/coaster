import { Component, computed, input, output, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  min,
  minLength,
  required,
  TreeValidationResult,
} from '@angular/forms/signals';
import { asCategoryId, Category, CreateProductDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterBtn, FormFieldMessages, NumberInput, SelectInput, TextInput } from '../../../shared';

@Component({
  selector: 'coaster-create-product-form',
  imports: [FormRoot, TextInput, NumberInput, SelectInput, FormField, CoasterBtn, TranslatePipe, FormFieldMessages],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <coaster-text-input
          [formField]="form.name"
          [label]="'pantry.create_product.name_label' | translate"
          [placeholder]="'pantry.create_product.name_placeholder' | translate"
        />

        <coaster-select-input
          [formField]="form.categoryId"
          [label]="'pantry.create_product.category_label' | translate"
          [options]="categoryOptions()"
          [placeholder]="'pantry.create_product.category_placeholder' | translate"
        />

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" showControls />

        <coaster-number-input
          [formField]="form.currentStock"
          [label]="'pantry.create_product.current_stock_label' | translate"
          showControls
        />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'pantry.create_product.min_stock_label' | translate"
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
            {{ 'pantry.create_product.cancel_btn' | translate }}
          </button>

          <button coaster-btn class="w-full" type="submit" variant="primary" [disabled]="disabled()">
            {{ 'pantry.create_product.submit_btn' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CreateProductForm {
  readonly categories = input.required<Category[]>();
  readonly disabled = input.required<boolean>();
  readonly submitAction = input.required<(payload: CreateProductDto) => Promise<TreeValidationResult>>();

  readonly canceled = output<void>();

  readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  });

  readonly #formBase = signal<Required<CreateProductDto>>({
    name: '',
    categoryId: asCategoryId(''),
    price: 0,
    currentStock: 0,
    minStockAlert: 5,
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

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
          const payload = form().value();
          const action = this.submitAction();

          return await action(payload);
        },
      },
    },
  );
}

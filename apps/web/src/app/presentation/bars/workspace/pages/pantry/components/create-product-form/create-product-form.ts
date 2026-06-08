import { Component, computed, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, min, minLength, required } from '@angular/forms/signals';
import type { Category, CreateProductDto } from '@coaster/common';
import { asCategoryId } from '@coaster/core';
import { ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { NumberInput } from '../../../../../../components/forms/number-input/number-input';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';

@Component({
  selector: 'coaster-create-product-form',
  imports: [FormRoot, MatFormField, MatLabel, MatInput, MatError, MatSelect, MatOption, NumberInput, FormField, MatButton, TranslatePipe],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.create_product.name_label' | translate }}</mat-label>
          <input
            matInput
            [formField]="form.name"
            [placeholder]="'pantry.create_product.name_placeholder' | translate"
          />
          @if (form.name().errors().length > 0) {
            <mat-error>{{ form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0] }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.create_product.category_label' | translate }}</mat-label>
          <mat-select [formField]="form.categoryId" [placeholder]="'pantry.create_product.category_placeholder' | translate">
            @for (option of categoryOptions(); track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
          @if (form.categoryId().errors().length > 0) {
            <mat-error>{{ form.categoryId().errors()[0].message || form.categoryId().errors()[0].kind | translate: form.categoryId().errors()[0] }}</mat-error>
          }
        </mat-form-field>

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" />

        <coaster-number-input
          [formField]="form.currentStock"
          [label]="'pantry.create_product.current_stock_label' | translate"
        />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'pantry.create_product.min_stock_label' | translate"
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
            (click)="handleCancel()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().disabled() || form().submitting()"
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

  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: this.#translate.instant(c.name),
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

          const error = await this.#productsStore.create(payload);

          if (!error) {
            this.created.emit();
          }

          return error;
        },
      },
    },
  );

  protected handleCancel() {
    this.canceled.emit();
  }
}

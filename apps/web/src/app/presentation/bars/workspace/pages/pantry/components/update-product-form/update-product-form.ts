import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import type { Category, UpdateProductDto } from '@coaster/common';
import { asCategoryId } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../components/number-input/number-input';

@Component({
  selector: 'coaster-edit-product-form',
  imports: [
    FormRoot,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOption,
    NumberInput,
    FormField,
    MatButton,
    TranslatePipe,
  ],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.edit_product.name_label' | translate }}</mat-label>
          <input matInput [formField]="form.name" [placeholder]="'pantry.edit_product.name_placeholder' | translate" />
          @if (form.name().errors().length > 0) {
            <mat-error>{{
              form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.edit_product.category_label' | translate }}</mat-label>
          <mat-select
            [formField]="form.categoryId"
            [placeholder]="'pantry.edit_product.category_placeholder' | translate"
          >
            @for (option of categoryOptions(); track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
          @if (form.categoryId().errors().length > 0) {
            <mat-error>{{
              form.categoryId().errors()[0].message || form.categoryId().errors()[0].kind
                | translate: form.categoryId().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'pantry.edit_product.min_stock_label' | translate"
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

  protected readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: this.#translate.instant(c.name),
    }));
  });

  readonly #productModel = signal<Required<UpdateProductDto>>({
    categoryId: asCategoryId(''),
    price: 0,
    minStockAlert: 0,
    name: '',
  });

  readonly form = form(
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

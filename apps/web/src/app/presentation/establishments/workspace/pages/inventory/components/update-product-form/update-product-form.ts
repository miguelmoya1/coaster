import { asCategoryId, isTemplateName } from '@coaster/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { disabled, form, FormField, FormRoot, maxLength, min, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import type { Category, UpdateProductDto } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { Product, ProductsStore } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NumberInput } from '../../../../../../components/number-input/number-input';
import { ImageUploader } from '../../../../../../components/image-uploader/image-uploader';

@Component({
  selector: 'coaster-edit-product-form',
  imports: [
    FormRoot,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatHint,
    MatSelect,
    MatOption,
    NumberInput,
    FormField,
    MatButton,
    TranslatePipe,
    ImageUploader,
  ],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'inventory.edit_product.name_label' | translate }}</mat-label>
          <input
            matInput
            [formField]="form.name"
            [placeholder]="'inventory.edit_product.name_placeholder' | translate"
          />
          @if (isImported()) {
            <mat-hint>{{ 'inventory.edit_product.name_from_template' | translate }}</mat-hint>
          }
          @if (form.name().errors().length > 0) {
            <mat-error>{{
              form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'inventory.edit_product.category_label' | translate }}</mat-label>
          <mat-select
            [formField]="form.categoryId"
            [placeholder]="'inventory.edit_product.category_placeholder' | translate"
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

        <coaster-image-uploader
          [establishmentId]="establishmentId()!"
          entityType="products"
          [label]="'inventory.edit_product.image_url_label' | translate"
          [value]="form.imageUrl().value()"
          (valueChange)="form.imageUrl().value.set($event)"
          [disabled]="form().submitting() || form().disabled()"
        />

        <coaster-number-input [formField]="form.price" [label]="'Precio (Céntimos)'" />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'inventory.edit_product.min_stock_label' | translate"
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

  protected readonly isImported = computed(() => isTemplateName(this.product().name));

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
    imageUrl: '',
  });

  readonly form = form(
    this.#productModel,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);
      disabled(fields.name, { when: () => this.isImported() });

      required(fields.categoryId);

      min(fields.price, 0);

      required(fields.minStockAlert);
      min(fields.minStockAlert, 0);
    },
    {
      submission: {
        action: async (form) => {
          // What the field shows for an imported product is the translation, not the stored key,
          // so sending it back would replace the key with one language's wording.
          const { name, ...rest } = form().value();
          const payload = this.isImported() ? rest : { name, ...rest };

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
          name: isTemplateName(product.name) ? this.#translate.instant(product.name) : product.name,
          categoryId: product.categoryId,
          price: product.price ?? 0,
          minStockAlert: product.minStockAlert,
          imageUrl: product.imageUrl ?? '',
        });
      }
    });
  }
}

import {
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  min,
  minLength,
  required,
} from '@angular/forms/signals';
import { asCategoryId, Category, CreateProductDto } from '@coaster/interfaces';
import { TranslatePipe } from '@ngx-translate/core';
import {
  Button,
  FormFieldMessages,
  NumberInput,
  SelectInput,
  TextInput,
} from '../../../shared';

@Component({
  selector: 'coaster-create-product-form',
  standalone: true,
  imports: [
    FormRoot,
    TextInput,
    NumberInput,
    SelectInput,
    FormField,
    Button,
    TranslatePipe,
    FormFieldMessages,
  ],
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

        <coaster-number-input
          [formField]="form.currentStock"
          [label]="'pantry.create_product.current_stock_label' | translate"
          [showControls]="true"
        />

        <coaster-number-input
          [formField]="form.minStockAlert"
          [label]="'pantry.create_product.min_stock_label' | translate"
          [showControls]="true"
        />

        @if (error(); as error) {
          <coaster-form-field-messages
            [invalid]="true"
            [errors]="[{ message: error | translate, kind: '' }]"
          />
        }

        <div class="flex justify-end mt-4 gap-2">
          <coaster-button
            class="w-full"
            type="button"
            variant="outline"
            [disabled]="disabled()"
            (click)="canceled.emit()"
          >
            {{ 'pantry.create_product.cancel_btn' | translate }}
          </coaster-button>

          <coaster-button
            class="w-full"
            type="submit"
            variant="primary"
            [disabled]="disabled()"
          >
            {{ 'pantry.create_product.submit_btn' | translate }}
          </coaster-button>
        </div>
      </div>
    </form>
  `,
})
export class CreateProductForm {
  public readonly categories = input.required<Category[]>();

  public readonly createProduct = output<CreateProductDto>();
  public readonly canceled = output<void>();

  public readonly disabled = input.required<boolean>();
  public readonly error = model.required<string | undefined>();

  readonly categoryOptions = computed(() => {
    return this.categories().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  });

  readonly #formBase = signal<Required<CreateProductDto>>({
    name: '',
    categoryId: asCategoryId(''),
    currentStock: 0,
    minStockAlert: 5,
  });

  protected readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);

      required(fields.categoryId);

      required(fields.currentStock);
      min(fields.currentStock, 0);

      required(fields.minStockAlert);
      min(fields.minStockAlert, 0);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();
          this.createProduct.emit(payload);
        },
      },
    },
  );
}

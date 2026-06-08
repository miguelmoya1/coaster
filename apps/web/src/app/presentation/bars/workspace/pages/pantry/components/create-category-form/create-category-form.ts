import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { CategoriesStore } from '@coaster/categories';
import type { CreateCategoryDto } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'coaster-create-category-form',
  imports: [FormRoot, MatFormFieldModule, MatInputModule, FormField, MatButton, TranslatePipe],
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.create_category.name_label' | translate }}</mat-label>
          <input
            matInput
            [formField]="form.name"
            [placeholder]="'pantry.create_category.name_placeholder' | translate"
          />
          @if (form.name().errors().length > 0) {
            <mat-error>{{ form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0] }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.create_category.icon_label' | translate }}</mat-label>
          <input
            matInput
            [formField]="form.icon"
            [placeholder]="'pantry.create_category.icon_placeholder' | translate"
          />
          @if (form.icon().errors().length > 0) {
            <mat-error>{{ form.icon().errors()[0].message || form.icon().errors()[0].kind | translate: form.icon().errors()[0] }}</mat-error>
          }
        </mat-form-field>

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
            [disabled]="form().submitting() || form().invalid()"
            (click)="cancelHandler()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button
            mat-flat-button
            class="w-full"
            type="submit"
            [disabled]="form().submitting() || form().invalid()"
          >
            {{ 'common.create' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CreateCategoryForm {
  readonly #categoryStore = inject(CategoriesStore);
  readonly canceled = output<void>();
  readonly created = output<void>();

  readonly #formBase = signal<Required<CreateCategoryDto>>({
    name: '',
    icon: '',
  });

  readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.name);
      minLength(fields.name, 2);
      maxLength(fields.name, 50);
    },
    {
      submission: {
        action: async (form) => {
          const payload = form().value();
          const error = await this.#categoryStore.create(payload);

          if (error) {
            return error;
          }

          this.created.emit();

          return null;
        },
      },
    },
  );

  protected cancelHandler() {
    this.canceled.emit();
  }
}

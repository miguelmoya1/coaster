import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CategoriesStore } from '@coaster/categories';
import type { Category } from '@coaster/common';
import { handleErrorFormField } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-edit-category-form',
  imports: [FormRoot, MatFormField, MatLabel, MatInput, MatError, FormField, MatButton, TranslatePipe],
  host: {
    class: 'block px-6 pb-6 pt-2',
  },
  template: `
    <form [formRoot]="form">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.edit_category.name_label' | translate }}</mat-label>
          <input matInput [formField]="form.name" [placeholder]="'pantry.edit_category.name_placeholder' | translate" />
          @if (form.name().errors().length > 0) {
            <mat-error>{{
              form.name().errors()[0].message || form.name().errors()[0].kind | translate: form.name().errors()[0]
            }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'pantry.edit_category.icon_label' | translate }}</mat-label>
          <input matInput [formField]="form.icon" [placeholder]="'pantry.edit_category.icon_placeholder' | translate" />
          @if (form.icon().errors().length > 0) {
            <mat-error>{{
              form.icon().errors()[0].message || form.icon().errors()[0].kind | translate: form.icon().errors()[0]
            }}</mat-error>
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
            [disabled]="form().submitting()"
            (click)="cancelHandler()"
          >
            {{ 'common.cancel' | translate }}
          </button>

          <button mat-flat-button class="w-full" type="submit" [disabled]="form().invalid() || form().submitting()">
            {{ 'common.update' | translate }}
          </button>
        </div>

        <div class="mt-4 border-t border-outline-variant/20 pt-4">
          <button
            mat-stroked-button
            class="warn w-full"
            type="button"
            [disabled]="form().submitting()"
            (click)="deleteHandler()"
          >
            {{ 'common.delete' | translate }}
          </button>
        </div>
      </div>
    </form>
  `,
})
export class EditCategoryForm {
  readonly #categoryStore = inject(CategoriesStore);

  readonly category = input.required<Category>();

  readonly canceled = output<void>();
  readonly deleted = output<void>();
  readonly updated = output<void>();

  readonly #formBase = linkedSignal(() => ({
    name: this.category().name,
    icon: this.category().icon || '',
  }));

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

          try {
            await this.#categoryStore.update(this.category().id, payload);
            this.updated.emit();
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  public cancelHandler() {
    this.canceled.emit();
  }

  public deleteHandler() {
    this.deleted.emit();
  }
}

import { Component, input, model } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-icon-picker',
  imports: [MatFormField, MatLabel, MatHint, MatError, TranslatePipe, MatIcon, MatSelectModule],
  template: `
    @if (!hidden()) {
      <mat-form-field [class]="wrapperClass()" appearance="outline">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }

        <mat-select
          [id]="id()"
          [value]="value()"
          (selectionChange)="onSelectionChange($event.value)"
          (openedChange)="onOpenedChange($event)"
          [placeholder]="placeholder()"
          [disabled]="disabled() || readonly()"
        >
          <mat-select-trigger>
            <div class="flex items-center gap-2">
              <mat-icon fontSet="material-symbols-outlined">{{ value() || 'category' }}</mat-icon>
              <span>{{ value() || 'category' | translate }}</span>
            </div>
          </mat-select-trigger>

          @for (icon of availableIcons; track icon) {
            <mat-option [value]="icon">
              <div class="flex items-center gap-2">
                <mat-icon fontSet="material-symbols-outlined">{{ icon }}</mat-icon>
                <span>{{ icon }}</span>
              </div>
            </mat-option>
          }
        </mat-select>

        @if (invalid() && errors().length > 0) {
          @for (error of errors(); track error) {
            <mat-error>{{ error.message || error.kind | translate: error }}</mat-error>
          }
        } @else if (hint() && !invalid()) {
          <mat-hint>{{ hint() }}</mat-hint>
        }
      </mat-form-field>
    }
  `,
})
export class IconPicker {
  readonly value = model<string>('');
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly wrapperClass = input<string>('w-full');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  readonly availableIcons = [
    'category',
    'local_bar',
    'local_cafe',
    'restaurant',
    'fastfood',
    'sports_bar',
    'icecream',
    'tapas',
    'wine_bar',
    'liquor',
    'local_dining',
    'local_pizza',
    'lunch_dining',
    'coffee',
    'bakery_dining',
    'cake',
  ];

  onSelectionChange(newValue: string) {
    this.value.set(newValue);
    this.touched.set(true);
  }

  onOpenedChange(opened: boolean) {
    if (!opened) {
      this.touched.set(true);
    }
  }
}

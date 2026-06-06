import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle } from '@ng-icons/lucide';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-text-input',
  imports: [NgIcon, MatFormFieldModule, MatInputModule, TranslatePipe],
  providers: [provideIcons({ lucideAlertCircle })],
  template: `
    @if (!hidden()) {
      <mat-form-field class="w-full" appearance="outline">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }

        @if (icon()) {
          <ng-icon
            [name]="icon()!"
            matPrefix
            class="mr-2 text-on-surface-variant text-xl"
            [class.text-error]="invalid()"
          />
        }

        <input
          matInput
          #inputEl
          [id]="id()"
          [type]="type()"
          [value]="value()"
          (input)="value.set(inputEl.value)"
          (blur)="touched.set(true)"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [required]="required()"
          [attr.aria-invalid]="invalid()"
        />

        @if (invalid() && !disabled() && touched()) {
          <ng-icon name="lucideAlertCircle" matSuffix class="text-error text-xl"></ng-icon>
        }

        @if (invalid() && errors().length > 0) {
          @for (error of errors(); track error) {
            <mat-error>{{ error.message || error.kind | translate: error }}</mat-error>
          }
        }

        @if (disabled() && disabledReasons().length > 0) {
          @for (reason of disabledReasons(); track reason) {
            <mat-hint>{{ reason.message | translate: reason }}</mat-hint>
          }
        } @else if (hint() && !invalid()) {
          <mat-hint>{{ hint() }}</mat-hint>
        }
      </mat-form-field>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInput implements FormValueControl<string> {
  readonly value = model<string>('');
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly icon = input<string>();
  readonly type = input<'text' | 'email' | 'password' | 'tel' | 'url' | 'time' | 'datetime-local'>('text');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);
}

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DisabledReason, FormCheckboxControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-toggle-input',
  imports: [MatSlideToggleModule, TranslatePipe],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full py-2">
        <mat-slide-toggle
          [id]="id()"
          [checked]="checked()"
          (change)="onToggleChange($event.checked)"
          [disabled]="disabled() || readonly()"
        >
          @if (label()) {
            <span class="text-sm font-medium text-on-surface" [class.text-error]="invalid()">
              {{ label() }}
              @if (required()) {
                <span class="text-error">*</span>
              }
            </span>
          }
        </mat-slide-toggle>

        @if (invalid() && errors().length > 0) {
          <div class="text-error text-xs mt-1 ml-1" role="alert">
            @for (error of errors(); track error) {
              <div>{{ error.message || error.kind | translate: error }}</div>
            }
          </div>
        }

        @if (disabled() && disabledReasons().length > 0) {
          <div class="text-on-surface-variant text-xs mt-1 ml-1">
            @for (reason of disabledReasons(); track reason) {
              <div>{{ reason.message | translate: reason }}</div>
            }
          </div>
        } @else if (hint() && !invalid()) {
          <div class="text-on-surface-variant text-xs mt-1 ml-1">
            {{ hint() }}
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleInput implements FormCheckboxControl {
  readonly checked = model<boolean>(false);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly hint = input<string>('');

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  onToggleChange(checked: boolean) {
    if (this.disabled() || this.readonly()) return;
    this.checked.set(checked);
    this.touched.set(true);
  }
}

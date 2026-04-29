import { Listbox, Option } from '@angular/aria/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { DisabledReason, FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { CoasterLabel } from '../../components/typography/typography';
import { FormFieldMessages } from '../form-field-messages/form-field-messages';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'coaster-select-input',
  imports: [NgIcon, CdkConnectedOverlay, CdkOverlayOrigin, Listbox, Option, CoasterLabel, FormFieldMessages],
  providers: [provideIcons({ lucideChevronDown, lucideCheck, lucideAlertCircle })],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        @if (label()) {
          <label [for]="id()" coaster-label class="ml-1" [class.text-error]="invalid()">
            {{ label() }}
            @if (required()) {
              <span class="text-error">*</span>
            }
          </label>
        }

        <button
          cdkOverlayOrigin
          #trigger="cdkOverlayOrigin"
          type="button"
          [id]="id()"
          class="h-14 w-full bg-surface-container rounded-xl px-4 flex items-center justify-between border active:scale-[0.98] transition-all text-on-surface text-left"
          [class.border-outline]="!invalid() && !isOpen()"
          [class.border-primary]="!invalid() && isOpen()"
          [class.border-error]="invalid()"
          [class.opacity-50]="disabled() || readonly()"
          [class.pointer-events-none]="disabled() || readonly()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-expanded]="isOpen()"
          aria-haspopup="listbox"
          (click)="toggleOpen($event)"
          (blur)="onBlur()"
        >
          <span class="truncate block" [class.text-on-surface-variant]="!hasValue()">
            {{ displayValue() || placeholder() }}
          </span>
          <div class="flex items-center gap-2 shrink-0">
            @if (invalid()) {
              <ng-icon name="lucideAlertCircle" class="text-error text-xl"></ng-icon>
            }
            <ng-icon
              name="lucideChevronDown"
              class="text-on-surface-variant text-xl transition-transform"
              [class.rotate-180]="isOpen()"
            ></ng-icon>
          </div>
        </button>

        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="trigger"
          [cdkConnectedOverlayOpen]="isOpen()"
          [cdkConnectedOverlayWidth]="triggerWidth()"
          (backdropClick)="close()"
          [cdkConnectedOverlayHasBackdrop]="true"
          cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
        >
          <div
            class="bg-surface-container-high rounded-xl border border-outline shadow-xl mt-2 overflow-hidden flex flex-col max-h-72 py-1 w-full"
          >
            <ul
              ngListbox
              [multi]="false"
              [values]="listboxValues()"
              (valuesChange)="onSelectionChange($event)"
              class="overflow-y-auto outline-none"
            >
              @if (options().length === 0) {
                <li class="px-4 py-4 text-on-surface-variant text-base flex items-center justify-center italic">
                  No options available
                </li>
              }
              @for (opt of options(); track opt.value) {
                <li
                  ngOption
                  [value]="opt.value"
                  [disabled]="opt.disabled || false"
                  class="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-surface-bright transition-colors aria-disabled:opacity-50 aria-disabled:cursor-not-allowed outline-none"
                  [class.bg-primary-container]="isSelected(opt.value)"
                  [class.text-on-primary-container]="isSelected(opt.value)"
                >
                  <span class="font-medium text-base truncate">{{ opt.label }}</span>
                  @if (isSelected(opt.value)) {
                    <ng-icon name="lucideCheck" class="text-primary text-xl"></ng-icon>
                  }
                </li>
              }
            </ul>
          </div>
        </ng-template>

        <coaster-form-field-messages
          [invalid]="invalid()"
          [disabled]="disabled()"
          [errors]="errors()"
          [disabledReasons]="disabledReasons()"
          [hint]="hint()"
        />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInput implements FormValueControl<string | number | null> {
  readonly value = model<string | number | null>(null);
  readonly id = input<string>(crypto.randomUUID());

  readonly label = input<string>('');
  readonly placeholder = input<string>('Select an option...');
  readonly hint = input<string>('');
  readonly options = input<SelectOption[]>([]);

  readonly touched = model<boolean>(false);

  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<readonly WithOptionalFieldTree<DisabledReason>[]>([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly required = input<boolean>(false);

  readonly isOpen = signal(false);
  readonly triggerWidth = signal<number | string>('auto');

  readonly hasValue = computed(() => this.value() !== null && this.value() !== undefined);
  readonly displayValue = computed(() => {
    const val = this.value();
    if (val === null || val === undefined) return '';
    const option = this.options().find((o) => o.value === val);
    return option ? option.label : String(val);
  });

  readonly listboxValues = computed(() => {
    const val = this.value();
    if (val === null || val === undefined) return [];
    const exists = this.options().some((o) => o.value === val);
    return exists ? [val] : [];
  });

  toggleOpen(event: MouseEvent) {
    if (this.disabled() || this.readonly()) return;
    this.isOpen.update((v) => !v);

    if (this.isOpen()) {
      const target = event.currentTarget as HTMLElement;
      this.triggerWidth.set(target.offsetWidth);
    }
  }

  close() {
    this.isOpen.set(false);
    this.touched.set(true);
  }

  onBlur() {
    if (!this.isOpen()) {
      this.touched.set(true);
    }
  }

  isSelected(val: string | number): boolean {
    return this.value() === val;
  }

  onSelectionChange(newValues: (string | number)[]) {
    const newVal = newValues.length > 0 ? newValues[0] : null;

    // Automatically correcting an invalid/stale initial value sets the selection to null.
    // We shouldn't close the dropdown when this background correction happens.
    const isAutoCorrection = newVal === null && this.value() !== null;

    this.value.set(newVal);

    if (!isAutoCorrection) {
      this.close();
    }
  }
}

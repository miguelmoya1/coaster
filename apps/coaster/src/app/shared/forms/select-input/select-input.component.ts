import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import {
  DisabledReason,
  FormValueControl,
  ValidationError,
  WithOptionalFieldTree,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheck,
  lucideChevronDown,
} from '@ng-icons/lucide';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Listbox, Option } from '@angular/aria/listbox';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'coaster-select-input',
  imports: [NgIcon, CdkConnectedOverlay, CdkOverlayOrigin, Listbox, Option],
  providers: [
    provideIcons({ lucideChevronDown, lucideCheck, lucideAlertCircle }),
  ],
  template: `
    @if (!hidden()) {
      <div class="flex flex-col gap-1 w-full">
        @if (label()) {
          <label
            [for]="id()"
            class="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1"
            [class.text-error]="invalid()"
          >
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
              <ng-icon
                name="lucideAlertCircle"
                class="text-error text-xl"
              ></ng-icon>
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
            class="bg-surface-container-high rounded-xl border border-outline shadow-xl mt-2 overflow-hidden flex flex-col max-h-64 py-1"
          >
            <ul
              ngListbox
              [multi]="false"
              [values]="listboxValues()"
              (valuesChange)="onSelectionChange($event)"
              class="overflow-y-auto outline-none"
            >
              @if (options().length === 0) {
                <li class="px-4 py-3 text-on-surface-variant text-sm flex items-center justify-center italic">
                  No options available
                </li>
              }
              @for (opt of options(); track opt.value) {
                <li
                  ngOption
                  [value]="opt.value"
                  [disabled]="opt.disabled || false"
                  class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-bright transition-colors aria-disabled:opacity-50 aria-disabled:cursor-not-allowed outline-none"
                  [class.bg-primary-container]="isSelected(opt.value)"
                  [class.text-on-primary-container]="isSelected(opt.value)"
                >
                  <span class="font-medium text-sm truncate">{{ opt.label }}</span>
                  @if (isSelected(opt.value)) {
                    <ng-icon name="lucideCheck" class="text-primary text-lg"></ng-icon>
                  }
                </li>
              }
            </ul>
          </div>
        </ng-template>

        @if (disabled() && disabledReasons().length > 0) {
          <div class="flex flex-col gap-1 mt-1 ml-1">
            @for (reason of disabledReasons(); track reason) {
              <span class="text-on-surface-variant text-xs">{{
                reason.message
              }}</span>
            }
          </div>
        }

        @if (hint() && !invalid()) {
          <span class="text-on-surface-variant text-xs ml-1">{{ hint() }}</span>
        }

        @if (invalid()) {
          <div class="flex flex-col gap-1 mt-1 ml-1" role="alert">
            @for (error of errors(); track error) {
              <span class="text-error text-xs font-medium">{{
                error.message
              }}</span>
            }
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInputComponent implements FormValueControl<string | number | null> {
  // Required
  readonly value = model<string | number | null>(null);
  readonly id = input<string>(crypto.randomUUID());

  // Custom props
  readonly label = input<string>('');
  readonly placeholder = input<string>('Select an option...');
  readonly hint = input<string>('');
  readonly options = input<SelectOption[]>([]);

  // Writable interaction state
  readonly touched = model<boolean>(false);

  // Read-only state from form system
  readonly disabled = input<boolean>(false);
  readonly disabledReasons = input<
    readonly WithOptionalFieldTree<DisabledReason>[]
  >([]);
  readonly readonly = input<boolean>(false);
  readonly hidden = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>(
    [],
  );
  readonly required = input<boolean>(false);

  // Component state
  readonly isOpen = signal(false);
  readonly triggerWidth = signal<number | string>('auto');

  // Computed state
  readonly hasValue = computed(() => this.value() !== null && this.value() !== undefined);
  readonly displayValue = computed(() => {
    const val = this.value();
    if (val === null || val === undefined) return '';
    const option = this.options().find((o) => o.value === val);
    return option ? option.label : String(val);
  });
  
  readonly listboxValues = computed(() => {
    const val = this.value();
    return val !== null && val !== undefined ? [val] : [];
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
    // Only mark as touched if we didn't open the popup. 
    // If we opened the popup, clicking outside will trigger close() which marks touched.
    if (!this.isOpen()) {
      this.touched.set(true);
    }
  }

  isSelected(val: string | number): boolean {
    return this.value() === val;
  }

  onSelectionChange(newValues: (string | number)[]) {
    const newVal = newValues.length > 0 ? newValues[0] : null;
    this.value.set(newVal);
    this.close();
  }
}

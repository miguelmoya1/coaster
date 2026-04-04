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
import { FormFieldMessages } from '../form-field-messages/form-field-messages';

export interface MultiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'coaster-multi-select-input',
  imports: [NgIcon, CdkConnectedOverlay, CdkOverlayOrigin, Listbox, Option, FormFieldMessages],
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
          class="min-h-14 w-full bg-surface-container rounded-xl px-4 py-2 flex items-center justify-between border active:scale-[0.98] transition-all text-on-surface text-left"
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
          <div class="flex flex-wrap items-center gap-1.5 flex-1 mr-2">
            @if (!hasValue()) {
              <span class="text-on-surface-variant">{{ placeholder() }}</span>
            } @else {
              @for (item of selectedDisplayItems(); track item.value) {
                <span class="inline-flex items-center gap-1 bg-surface-variant text-on-surface-variant px-3 py-1.5 rounded-lg text-sm font-medium border border-outline-variant">
                  {{ item.label }}
                </span>
              }
            }
          </div>
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
            class="bg-surface-container-high rounded-xl border border-outline shadow-xl mt-2 overflow-hidden flex flex-col max-h-72 py-1 w-full"
          >
            <ul
              ngListbox
              [multi]="true"
              [values]="value()"
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
                  class="outline-none block w-full"
                  (keydown.space)="toggleOption(opt.value, $event)"
                  (keydown.enter)="toggleOption(opt.value, $event)"
                >
                  <div
                    class="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-surface-bright transition-colors aria-disabled:opacity-50 aria-disabled:cursor-not-allowed outline-none w-full"
                    [class.bg-primary-container]="isSelected(opt.value)"
                    [class.text-on-primary-container]="isSelected(opt.value)"
                    (click)="toggleOption(opt.value, $event)"
                    (pointerdown)="$event.stopPropagation()"
                    (mousedown)="$event.stopPropagation()"
                    (keydown.space)="$event.preventDefault()"
                    tabindex="-1"
                  >
                    <div class="w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors"
                         [class.bg-primary]="isSelected(opt.value)"
                         [class.border-primary]="isSelected(opt.value)"
                         [class.border-outline-variant]="!isSelected(opt.value)">
                      @if (isSelected(opt.value)) {
                        <ng-icon name="lucideCheck" class="text-on-primary text-xl"></ng-icon>
                      }
                    </div>
                    <span class="font-medium text-base truncate">{{ opt.label }}</span>
                  </div>
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
export class MultiSelectInput implements FormValueControl<(string | number)[]> {
  // Required
  readonly value = model<(string | number)[]>([]);
  readonly id = input<string>(crypto.randomUUID());

  // Custom props
  readonly label = input<string>('');
  readonly placeholder = input<string>('Select options...');
  readonly hint = input<string>('');
  readonly options = input<MultiSelectOption[]>([]);

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
  readonly hasValue = computed(() => this.value() && this.value().length > 0);
  
  readonly selectedDisplayItems = computed(() => {
    const vals = this.value();
    if (!vals || vals.length === 0) return [];
    
    // Map values to display objects
    return vals.map(val => {
      const option = this.options().find(o => o.value === val);
      return {
        value: val,
        label: option ? option.label : String(val)
      };
    });
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
    return this.value()?.includes(val) || false;
  }


  onSelectionChange(newValues: (string | number)[]) {
    this.value.set(newValues);
  }

  toggleOption(val: string | number, event: Event) {
    if (this.disabled() || this.readonly()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    const current = this.value() || [];
    if (current.includes(val)) {
      this.value.set(current.filter((v) => v !== val));
    } else {
      this.value.set([...current, val]);
    }
  }
}

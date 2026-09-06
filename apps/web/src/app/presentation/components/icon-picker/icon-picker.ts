import { Component, computed, input, model, signal } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../field/field';
import { CoasterInput } from '../field/input.directive';

export const SUGGESTED_ICONS = [
  'category',
  'restaurant',
  'local_bar',
  'local_cafe',
  'coffee',
  'sports_bar',
  'wine_bar',
  'liquor',
  'water_drop',
  'local_drink',
  'emoji_food_beverage',
  'tapas',
  'lunch_dining',
  'dinner_dining',
  'breakfast_dining',
  'bakery_dining',
  'local_pizza',
  'kebab_dining',
  'set_meal',
  'ramen_dining',
  'icecream',
  'cake',
  'nutrition',
  'egg_alt',
  'fastfood',
  'storefront',
  'shopping_bag',
  'inventory_2',
  'checkroom',
  'redeem',
  'local_florist',
  'candle',
] as const;

export const isMaterialIconName = (icon: string | null | undefined): boolean =>
  typeof icon === 'string' && /^[a-z][a-z0-9_]*$/.test(icon);

const BATCH = 90;

const SCROLL_MARGIN = 120;

@Component({
  selector: 'coaster-icon-picker',
  imports: [Field, CoasterInput, MatIcon, TranslatePipe],
  template: `
    @if (!hidden()) {
      <coaster-field
        [class]="wrapperClass()"
        [label]="label()"
        [hint]="hint()"
        [errors]="touched() && invalid() ? errors() : []"
      >
        <button
          type="button"
          data-testid="icon-picker-trigger"
          coasterInput
          class="flex w-full items-center gap-2 text-left"
          [id]="id()"
          [disabled]="disabled() || readonly()"
          [attr.aria-expanded]="isOpen()"
          aria-haspopup="listbox"
          (click)="toggle()"
        >
          <mat-icon class="text-on-surface-variant">{{ value() || 'category' }}</mat-icon>
          <span class="grow truncate">{{ value() || placeholder() }}</span>
          <mat-icon class="text-on-surface-variant/60">{{ isOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </coaster-field>

      @if (isOpen()) {
        <div class="mt-2 rounded-xl border border-outline-variant bg-surface-container p-2">
          <input
            coasterInput
            type="search"
            data-testid="icon-picker-search"
            [value]="query()"
            [attr.aria-label]="'components.icon_picker.search' | translate"
            [placeholder]="'components.icon_picker.search' | translate"
            (input)="onSearch($event)"
          />

          @if (isLoading()) {
            <p class="p-4 text-center text-sm text-on-surface-variant">
              {{ 'components.icon_picker.loading' | translate }}
            </p>
          } @else if (shown().length === 0) {
            <p class="p-4 text-center text-sm text-on-surface-variant" role="status">
              {{ 'components.icon_picker.empty' | translate }}
            </p>
          } @else {
            <div
              class="mt-2 grid max-h-56 grid-cols-6 gap-1 overflow-y-auto"
              role="listbox"
              data-testid="icon-picker-grid"
              (scroll)="onScroll($event)"
            >
              @for (icon of shown(); track icon) {
                <button
                  type="button"
                  class="flex h-12 items-center justify-center rounded-lg hover:bg-surface-container-highest"
                  [class.bg-surface-container-highest]="icon === value()"
                  [attr.aria-label]="icon"
                  [attr.aria-selected]="icon === value()"
                  role="option"
                  [title]="icon"
                  (click)="choose(icon)"
                >
                  <mat-icon>{{ icon }}</mat-icon>
                </button>
              }
            </div>

            @if (hasMore()) {
              <p class="px-1 pt-2 text-xs text-on-surface-variant" aria-live="polite">
                {{ 'components.icon_picker.more' | translate: { shown: shown().length, total: matches().length } }}
              </p>
            }
          }
        </div>
      }
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

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');

  readonly #catalogue = signal<readonly string[] | null>(null);

  protected readonly isLoading = computed(() => this.#catalogue() === null);

  protected readonly matches = computed(() => {
    const catalogue = this.#catalogue();

    if (!catalogue) {
      return [];
    }

    const term = this.query().trim().toLowerCase().replace(/\s+/g, '_');

    if (!term) {
      return SUGGESTED_ICONS as readonly string[];
    }

    return catalogue.filter((icon) => icon.includes(term));
  });

  protected readonly visibleCount = signal(BATCH);

  protected readonly shown = computed(() => this.matches().slice(0, this.visibleCount()));

  protected readonly hasMore = computed(() => this.matches().length > this.visibleCount());

  protected onScroll(event: Event): void {
    const grid = event.target as HTMLElement;
    const reachedBottom = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - SCROLL_MARGIN;

    if (reachedBottom && this.hasMore()) {
      this.visibleCount.update((count) => count + BATCH);
    }
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.visibleCount.set(BATCH);
  }

  protected choose(icon: string): void {
    this.value.set(icon);
    this.touched.set(true);
    this.isOpen.set(false);
    this.query.set('');
    this.visibleCount.set(BATCH);
  }

  protected toggle(): void {
    const opening = !this.isOpen();
    this.isOpen.set(opening);

    if (opening) {
      void this.#loadCatalogue();
    } else {
      this.touched.set(true);
    }
  }

  async #loadCatalogue(): Promise<void> {
    if (this.#catalogue()) {
      return;
    }

    const { MATERIAL_ICON_NAMES } = await import('./material-icon-names');

    this.#catalogue.set(MATERIAL_ICON_NAMES);
  }
}

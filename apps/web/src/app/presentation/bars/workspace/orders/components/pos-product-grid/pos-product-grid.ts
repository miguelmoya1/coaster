import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Category, Product } from '@coaster/common';
import { PricePipe } from '@coaster/shared';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideX } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-pos-product-grid',
  imports: [TranslatePipe, PricePipe, NgIcon],
  viewProviders: [
    provideIcons({
      lucideSearch,
      lucideX,
    }),
  ],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Search Input -->
      <div class="relative w-full">
        <ng-icon name="lucideSearch" class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg" />
        <input
          type="text"
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
          [placeholder]="'orders.search_placeholder' | translate"
          class="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 rounded-xl pl-10 pr-10 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        @if (searchQuery()) {
          <button
            (click)="searchQuery.set('')"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <ng-icon name="lucideX" class="text-lg" />
          </button>
        }
      </div>

      <!-- Categories filters -->
      <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button
          class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95"
          [class]="
            !selectedCategory()
              ? 'bg-primary text-on-primary-fixed shadow-lg'
              : 'bg-surface-container-highest text-on-surface-variant'
          "
          (click)="categorySelected.emit(undefined)"
        >
          {{ 'orders.all_categories' | translate }}
        </button>
        @for (cat of categories(); track cat.id) {
          <button
            class="px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95"
            [class]="
              selectedCategory() === cat.id
                ? 'bg-primary text-on-primary-fixed shadow-lg'
                : 'bg-surface-container-highest text-on-surface-variant'
            "
            (click)="categorySelected.emit(cat.id)"
          >
            {{ cat.name | translate }}
          </button>
        }
      </div>

      <!-- Products Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        @for (product of filteredProducts(); track product.id) {
          <button
            class="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center gap-1 min-h-22.5 active:scale-95 transition-transform active:bg-primary/10 border border-transparent hover:border-primary/30"
            (click)="productClicked.emit(product)"
          >
            <span class="font-semibold text-on-surface text-sm text-center leading-tight">{{ product.name | translate }}</span>
            <span class="font-bold text-primary text-xs">{{ product.price | price }}</span>
          </button>
        } @empty {
          <div class="col-span-full text-center text-on-surface-variant py-8">
            {{ 'orders.no_products' | translate }}
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosProductGrid {
  readonly products = input.required<Product[]>();
  readonly categories = input.required<Category[]>();
  readonly selectedCategory = input<string | undefined>(undefined);
  readonly productClicked = output<Product>();
  readonly categorySelected = output<string | undefined>();

  readonly searchQuery = signal<string>('');
  readonly #translate = inject(TranslateService);

  readonly filteredProducts = computed(() => {
    const list = this.products();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;

    return list.filter((p) => {
      const rawNameMatches = p.name.toLowerCase().includes(query);
      if (rawNameMatches) return true;

      const translatedName = this.#translate.instant(p.name);
      return translatedName.toLowerCase().includes(query);
    });
  });

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }
}


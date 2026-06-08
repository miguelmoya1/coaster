import { Component, computed, inject, input, output, signal } from '@angular/core';
import type { Category } from '@coaster/common';
import { Product } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PricePipe } from '../../../pipes/price/price';
import { MatChipsModule } from '@angular/material/chips';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'coaster-pos-product-grid',
  imports: [TranslatePipe, PricePipe, MatButtonModule, MatIcon, MatChipsModule, MatCard],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Search Input -->
      <div class="relative w-full">
        <mat-icon
          class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg"
        >search</mat-icon>
        <input
          type="text"
          [value]="searchQuery()"
          (input)="onSearchInput($event)"
          [placeholder]="'orders.search_placeholder' | translate"
          class="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 rounded-xl pl-10 pr-10 py-2.5 text-sm border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        @if (searchQuery()) {
          <button mat-icon-button
            (click)="searchQuery.set('')"
            class="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        }
      </div>

      <!-- Categories filters -->
      <mat-chip-listbox [value]="selectedCategory()" (change)="categorySelected.emit($event.value)" class="hide-scrollbar">
        @for (category of categoryTabs(); track category.id) {
          <mat-chip-option [value]="category.id" [selectable]="true">
            {{ category.label | translate }}
          </mat-chip-option>
        }
      </mat-chip-listbox>

      <!-- Products Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        @for (product of filteredProducts(); track product.id) {
          <mat-card
            class="relative overflow-hidden cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all duration-200 p-0!"
            [class.border-error/30]="product.currentStock <= 0"
            [class.opacity-60]="product.currentStock <= 0"
          >
            <button
              class="w-full h-full flex flex-col items-center justify-center gap-1 border border-transparent p-4 text-center cursor-pointer"
              [class.border-error/30]="product.currentStock <= 0"
              (click)="productClicked.emit(product)"
            >
              <span
                class="font-semibold text-on-surface text-sm text-center leading-tight line-clamp-2 break-words w-full h-10 flex items-center justify-center"
                [title]="product.name | translate"
              >
                {{ product.name | translate }}
              </span>
              <div class="flex flex-col items-center gap-1 mt-1 w-full">
                <span class="font-bold text-primary text-sm">{{ product.price | price }}</span>
                <span
                  class="text-[0.6875rem] px-2 py-0.5 rounded-full font-bold w-fit text-center"
                  [class]="
                    product.currentStock > 0
                      ? 'bg-surface-container-highest text-on-surface-variant'
                      : 'bg-error/15 text-error'
                  "
                >
                  {{
                    product.currentStock > 0
                      ? ('orders.stock' | translate: { count: product.currentStock })
                      : ('orders.no_stock' | translate)
                  }}
                </span>
              </div>
            </button>
          </mat-card>
        } @empty {
          <div class="col-span-full text-center text-on-surface-variant py-8">
            {{ 'orders.no_products' | translate }}
          </div>
        }
      </div>
    </div>
  `,
  })
export class PosProductGrid {
  readonly products = input.required<Product[]>();
  readonly categories = input.required<Category[]>();
  readonly selectedCategory = input<string | undefined>(undefined);
  readonly productClicked = output<Product>();
  readonly categorySelected = output<string | undefined>();

  readonly categoryTabs = computed(() => {
    const rawCategories = this.categories() ?? [];
    return [
      { id: undefined, label: this.#translate.instant('orders.all_categories') },
      ...rawCategories.map((c) => ({ id: c.id as string | undefined, label: c.name })),
    ];
  });

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

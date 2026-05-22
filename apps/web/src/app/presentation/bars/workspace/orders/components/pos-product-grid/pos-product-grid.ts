import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Category, Product } from '@coaster/common';
import { PricePipe } from '@coaster/shared';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-pos-product-grid',
  imports: [TranslatePipe, PricePipe],
  template: `
    <div class="flex flex-col gap-4">
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

      <div class="grid grid-cols-3 gap-2">
        @for (product of products(); track product.id) {
          <button
            class="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center gap-1 min-h-22.5 active:scale-95 transition-transform active:bg-primary/10 border border-transparent hover:border-primary/30"
            (click)="productClicked.emit(product)"
          >
            <span class="font-semibold text-on-surface text-sm text-center leading-tight">{{ product.name | translate }}</span>
            <span class="font-bold text-primary text-xs">{{ product.price | price }}</span>
          </button>
        } @empty {
          <div class="col-span-3 text-center text-on-surface-variant py-8">
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
}

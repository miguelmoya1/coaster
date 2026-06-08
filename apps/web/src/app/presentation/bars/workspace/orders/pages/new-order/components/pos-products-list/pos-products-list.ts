import { Component, input, output } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { Product } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-pos-products-list',
  imports: [TranslatePipe, PricePipe, MatCard],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      @for (product of products(); track product.id) {
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
              class="font-semibold text-on-surface text-sm text-center leading-tight line-clamp-2 wrap-break-word w-full h-10 flex items-center justify-center"
              [title]="product.name | translate"
            >
              {{ product.name | translate }}
            </span>
            <div class="flex flex-col items-center gap-1 mt-1 w-full">
              <span class="font-bold text-primary text-sm">{{ product.price | price }}</span>
              <span
                class="text-xxs-plus px-2 py-0.5 rounded-full font-bold w-fit text-center"
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
  `,
})
export class PosProductsList {
  readonly products = input.required<Product[]>();
  readonly productClicked = output<Product>();
}

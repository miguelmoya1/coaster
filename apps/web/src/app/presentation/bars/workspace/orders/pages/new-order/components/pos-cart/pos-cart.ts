import { Component, computed, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { Table } from '@coaster/common';
import { TableStatus } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'coaster-pos-cart',
  imports: [MatIcon, TranslatePipe, MatButton, MatIconButton, PricePipe],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-on-surface text-lg">{{ 'orders.cart' | translate }}</h3>
        @if (items().length > 0) {
          <span
            class="text-xs font-semibold text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full"
          >
            {{ items().length }} {{ 'orders.items' | translate }}
          </span>
        }
      </div>

      @if (items().length === 0) {
        <div class="text-center text-on-surface-variant py-6 text-sm">
          {{ 'orders.empty_cart' | translate }}
        </div>
      } @else {
        <div class="flex flex-col gap-2 max-h-[30vh] overflow-y-auto">
          @for (item of items(); track item.productId) {
            <div class="bg-surface-container rounded-xl p-3 flex items-center gap-3">
              <div class="flex-1">
                <span class="font-semibold text-on-surface text-sm">{{ item.productName | translate }}</span>
                <span class="text-xs text-on-surface-variant ml-2">{{ item.price * item.quantity | price }}</span>
              </div>

              <div class="flex items-center gap-1">
                <button mat-icon-button (click)="decrementClicked.emit(item.productId)">
                  @if (item.quantity === 1) {
                    <mat-icon class="text-error text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">delete</mat-icon>
                  } @else {
                    <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">remove</mat-icon>
                  }
                </button>
                <span class="w-8 text-center font-bold text-sm">{{ item.quantity }}</span>
                <button mat-icon-button (click)="incrementClicked.emit(item.productId)">
                  <mat-icon class="text-[14px]! w-[14px]! h-[14px]! leading-[14px]! m-0!">add</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>

        <div class="flex flex-col gap-2">
          @if (tables().length > 0 && !tableLocked()) {
            <select
              class="w-full rounded-xl bg-surface-container-highest text-on-surface p-3 text-sm font-medium border border-outline-variant/30 outline-none focus:border-primary"
              [value]="selectedTableId() ?? ''"
              (change)="tableSelected.emit($any($event.target).value || undefined)"
            >
              <option value="">{{ 'orders.no_table' | translate }}</option>
              @for (table of freeTables(); track table.id) {
                <option [value]="table.id">{{ table.name }}</option>
              }
            </select>
          }

          <div class="flex justify-between items-center px-1">
            <span class="font-bold text-on-surface">{{ 'orders.total' | translate }}</span>
            <span class="text-xl font-black text-primary">{{ totalCents() | price }}</span>
          </div>

          <button
            mat-flat-button
            class="w-full"
            [disabled]="items().length === 0 || disabled()"
            (click)="submitClicked.emit()"
          >
            <mat-icon class="text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">send</mat-icon>
            {{ 'orders.send_order' | translate }}
          </button>
        </div>
      }
    </div>
  `,
})
export class PosCart {
  readonly items = input.required<CartItem[]>();
  readonly tables = input<Table[]>([]);
  readonly selectedTableId = input<string | undefined>(undefined);
  readonly tableLocked = input(false);
  readonly disabled = input(false);

  readonly incrementClicked = output<string>();
  readonly decrementClicked = output<string>();
  readonly tableSelected = output<string | undefined>();
  readonly submitClicked = output<void>();

  readonly freeTables = computed(() => this.tables().filter((t) => t.status === TableStatus.FREE));

  readonly totalCents = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));
}

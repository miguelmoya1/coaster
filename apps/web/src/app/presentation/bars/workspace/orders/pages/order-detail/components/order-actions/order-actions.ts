import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-order-actions',
  imports: [MatButton, MatIcon, TranslatePipe],
  host: { class: 'flex flex-col gap-2 w-full mt-2' },
  template: `
    <div class="flex flex-col sm:grid sm:grid-cols-2 gap-2">
      <button mat-stroked-button (click)="addItems.emit()" class="w-full">
        <mat-icon>add_box</mat-icon>
        {{ 'orders.add_items' | translate }}
      </button>
      <button mat-flat-button (click)="checkout.emit()" class="w-full">
        <mat-icon>credit_card</mat-icon>
        {{ 'orders.checkout' | translate }}
      </button>
    </div>

    <div class="flex flex-col sm:grid sm:grid-cols-2 gap-2">
      <button mat-stroked-button (click)="moveTable.emit()" class="w-full">
        <mat-icon>swap_horiz</mat-icon>
        {{ (hasTable() ? 'orders.move' : 'orders.assign_table') | translate }}
      </button>
      <button mat-stroked-button (click)="merge.emit()" class="w-full">
        <mat-icon>merge</mat-icon>
        {{ 'orders.merge' | translate }}
      </button>
      <button mat-stroked-button class="w-full" (click)="cancelOrder.emit()">
        <mat-icon>close</mat-icon>
        {{ 'orders.cancel_order' | translate }}
      </button>
      <button mat-stroked-button class="w-full" (click)="printOrder.emit()">
        <mat-icon>receipt_long</mat-icon>
        {{ 'orders.print_ticket' | translate }}
      </button>
    </div>
  `,
})
export class OrderActions {
  readonly hasTable = input<boolean>(false);

  readonly addItems = output<void>();
  readonly checkout = output<void>();
  readonly moveTable = output<void>();
  readonly merge = output<void>();
  readonly cancelOrder = output<void>();
  readonly printOrder = output<void>();
}

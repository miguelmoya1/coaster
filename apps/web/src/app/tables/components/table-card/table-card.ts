import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Table, TableStatus } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideTrash2, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../shared';

@Component({
  selector: 'coaster-table-card',
  imports: [NgIcon, TranslatePipe, PricePipe],
  viewProviders: [provideIcons({ lucideUsers, lucideCircleCheck, lucideTrash2 })],
  template: `
    <div class="relative">
      <button
        class="w-full rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer border-2 min-h-[120px]"
        [class]="statusClasses()"
        (click)="cardClicked.emit(table())"
      >
        <ng-icon [name]="statusIcon()" class="text-2xl" />
        <span class="font-bold text-base leading-tight text-center">{{ table().name }}</span>
        <span class="text-xs font-semibold uppercase tracking-wider">
          {{ statusLabelKey() | translate }}
        </span>
        @if (orderAmount()) {
          <span class="text-lg font-black mt-1">{{ orderAmount() | price }}</span>
        }
      </button>

      @if (deletable() && table().status !== 'OCCUPIED') {
        <button
          class="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-error text-on-error flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          (click)="$event.stopPropagation(); deleteClicked.emit(table())"
        >
          <ng-icon name="lucideTrash2" size="14" />
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCard {
  readonly table = input.required<Table>();
  readonly orderAmount = input<number | undefined>(undefined);
  readonly deletable = input(false);
  readonly cardClicked = output<Table>();
  readonly deleteClicked = output<Table>();

  readonly statusClasses = computed(() => {
    if (this.table().status === TableStatus.OCCUPIED) {
      return 'bg-error/10 border-error/40 text-error';
    }
    return 'bg-secondary/10 border-secondary/40 text-secondary';
  });

  readonly statusIcon = computed(() =>
    this.table().status === TableStatus.OCCUPIED ? 'lucideUsers' : 'lucideCircleCheck',
  );

  readonly statusLabelKey = computed(() =>
    this.table().status === TableStatus.OCCUPIED ? 'orders.table_occupied' : 'orders.table_free',
  );
}

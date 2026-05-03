import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Table, TableStatus } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideUsers } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-table-card',
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideUsers, lucideCircleCheck })],
  template: `
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
      @if (amount()) {
        <span class="text-lg font-black mt-1">{{ amount() }}</span>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCard {
  readonly table = input.required<Table>();
  readonly orderAmount = input<number | undefined>(undefined);
  readonly cardClicked = output<Table>();

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

  readonly amount = computed(() => {
    const amt = this.orderAmount();
    if (amt === undefined || amt === 0) return undefined;
    return (amt / 100).toFixed(2) + ' €';
  });
}

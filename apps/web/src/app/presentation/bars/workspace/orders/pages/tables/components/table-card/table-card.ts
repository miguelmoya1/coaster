import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Table } from '@coaster/common';
import { TableStatusPipe } from '@coaster/tables';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-table-card',
  imports: [TranslatePipe, PricePipe, TableStatusPipe, MatButtonModule, MatIcon],
  template: `
    <div class="relative">
      <button
        class="w-full rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer border-2 min-h-30"
        [class]="table().status | tableStatus: 'class'"
        (click)="cardClicked.emit(table())"
      >
        <mat-icon class="text-2xl">{{ table().status | tableStatus: 'icon' }}</mat-icon>
        <span class="font-bold text-base leading-tight text-center">{{ table().name }}</span>
        <span class="text-xs font-semibold uppercase tracking-wider">
          {{ table().status | tableStatus: 'label' | translate }}
        </span>
        @if (orderAmount()) {
          <span class="text-lg font-black mt-1">{{ orderAmount() | price }}</span>
        }
      </button>

      @if (deletable() && table().status !== 'OCCUPIED') {
        <button mat-icon-button
          class="absolute -top-2 -right-2 text-error"
          (click)="$event.stopPropagation(); deleteClicked.emit(table())"
        >
          <mat-icon style="font-size: 14px; width: 14px; height: 14px;">delete</mat-icon>
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
}

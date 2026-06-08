import { Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import type { Table } from '@coaster/common';
import { TableStatusPipe } from '@coaster/tables';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../../../pipes/price/price';

@Component({
  selector: 'coaster-table-card',
  imports: [TranslatePipe, PricePipe, TableStatusPipe, MatButton, MatIcon, MatCard, MatChip],
  template: `
    <mat-card
      class="relative cursor-pointer active:scale-[0.97] transition-all duration-200 p-0! overflow-hidden flex flex-col items-center min-h-[200px]"
      (click)="cardClicked.emit(table())"
    >
      <!-- Top accent gradient bar -->
      <div
        class="w-full h-0.75"
        [class]="isOccupied() ? 'bg-linear-to-r from-error to-error/30' : 'bg-linear-to-r from-success to-success/30'"
      ></div>

      <!-- Card body -->
      <div class="flex flex-col items-center gap-2.5 px-4 pt-5 pb-4 flex-1 justify-center w-full">
        <!-- Icon circle -->
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center border-[1.5px]"
          [class]="isOccupied() ? 'bg-error/10 border-error/25' : 'bg-success/10 border-success/25'"
        >
          <mat-icon
            class="text-[22px]! w-5.5! h-5.5! leading-5.5! m-0!"
            [class]="isOccupied() ? 'text-error' : 'text-success'"
          >
            {{ table().status | tableStatus: 'icon' }}
          </mat-icon>
        </div>

        <!-- Table name -->
        <span class="text-base font-extrabold text-on-surface leading-tight tracking-tight">
          {{ table().name }}
        </span>

        <!-- Status pill -->
        <mat-chip [class]="isOccupied() ? 'error' : 'success'">
          {{ table().status | tableStatus: 'label' | translate }}
        </mat-chip>

        <!-- Price or hint -->
        @if (orderAmount()) {
          <span class="text-lg font-black text-primary leading-none tracking-tight mt-0.5">
            {{ orderAmount() | price }}
          </span>
        } @else {
          <span class="text-[0.65rem] text-on-surface-variant/50 italic leading-snug text-center max-w-[90%]">
            {{ 'orders.free_table_hint' | translate }}
          </span>
        }
      </div>

      <!-- Delete button -->
      @if (deletable() && !isOccupied()) {
        <div class="w-full border-t border-outline-variant/20 px-2 py-1">
          <button
            mat-button
            class="warn w-full text-xs! font-semibold"
            (click)="deleteClicked.emit(table()); $event.stopPropagation()"
          >
            <mat-icon class="text-[14px]! w-[14px]! h-[14px]! m-0! mr-1!">delete_outline</mat-icon>
            {{ 'common.delete' | translate }}
          </button>
        </div>
      }
    </mat-card>
  `,
})
export class TableCard {
  readonly table = input.required<Table>();
  readonly orderAmount = input<number | undefined>(undefined);
  readonly deletable = input(false);
  readonly cardClicked = output<Table>();
  readonly deleteClicked = output<Table>();

  protected readonly isOccupied = computed(() => this.table().status === 'OCCUPIED');
}

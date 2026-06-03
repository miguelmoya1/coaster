import { Pipe, PipeTransform } from '@angular/core';
import type { TableStatus } from '@coaster/common';

@Pipe({
  name: 'tableStatus',
})
export class TableStatusPipe implements PipeTransform {
  transform(status: TableStatus, type: 'class' | 'icon' | 'label') {
    const isOccupied = status === 'OCCUPIED';

    switch (type) {
      case 'class':
        return isOccupied
          ? 'bg-error/10 border-error/40 text-error'
          : 'bg-secondary/10 border-secondary/40 text-secondary';
      case 'icon':
        return isOccupied ? 'lucideUsers' : 'lucideCircleCheck';
      case 'label':
        return isOccupied ? 'orders.table_occupied' : 'orders.table_free';
      default:
        return '';
    }
  }
}
